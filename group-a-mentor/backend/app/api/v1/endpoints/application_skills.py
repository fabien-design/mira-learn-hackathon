"""Endpoints — Skills déclarées sur la candidature (/me/skills)."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, require_auth
from app.core.db import get_db
from app.core.responses import success_response
from app.schemas.mentor_application_skill import (
    MentorApplicationSkillBase,
    MentorApplicationSkillRead,
    MentorApplicationSkillSetAll,
)
from app.services import application_skill_service

router = APIRouter(
    prefix="/mentors/applications/me/skills",
    tags=["mentor-applications"],
)


def _serialize(row) -> dict:
    return MentorApplicationSkillRead.model_validate(row).model_dump(mode="json")


@router.get("", response_model=dict)
async def list_skills(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    rows = await application_skill_service.list_for_user(db, user.user_id)
    return success_response([_serialize(r) for r in rows])


@router.put("", response_model=dict)
async def set_skills(
    body: MentorApplicationSkillSetAll,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    rows = await application_skill_service.set_all(db, user.user_id, body.skills)
    return success_response(
        [_serialize(r) for r in rows], message="Skills mises à jour"
    )


@router.post("", response_model=dict)
async def add_skill(
    body: MentorApplicationSkillBase,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    row = await application_skill_service.add_one(db, user.user_id, body)
    return success_response(_serialize(row), message="Skill ajoutée")


@router.delete("/{skill_id}", response_model=dict)
async def remove_skill(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    await application_skill_service.remove_one(db, user.user_id, skill_id)
    return success_response(None, message="Skill retirée")
