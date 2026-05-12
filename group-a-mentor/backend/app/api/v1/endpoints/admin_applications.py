"""Endpoints — Admin backoffice (modération candidatures)."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, require_role
from app.core.db import get_db
from app.core.responses import success_response
from app.models.mentor_application import MentorApplication
from app.models.mira_class import MiraClass
from app.schemas.mentor_application import MentorApplicationRead, MentorApplicationReviewDecision
from app.schemas.mira_class import MiraClassRead
from app.services.mentor_application_service import review_application

router = APIRouter(prefix="/admin/mentors/applications", tags=["admin"])


@router.get("", response_model=dict)
async def list_applications(
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: AuthenticatedUser = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    q = select(MentorApplication).where(MentorApplication.deleted_at.is_(None))
    if status_filter:
        q = q.where(MentorApplication.status == status_filter)
    q = q.order_by(MentorApplication.submitted_at.desc().nulls_last()).offset(offset).limit(limit)
    result = await db.execute(q)
    apps = result.scalars().all()
    return success_response([MentorApplicationRead.model_validate(a).model_dump() for a in apps])


@router.get("/{application_id}", response_model=dict)
async def get_application(
    application_id: str,
    user: AuthenticatedUser = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MentorApplication).where(
            MentorApplication.id == application_id,
            MentorApplication.deleted_at.is_(None),
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidature introuvable")
    return success_response(MentorApplicationRead.model_validate(app).model_dump())


@router.post("/{application_id}/review", response_model=dict)
async def review_application_endpoint(
    application_id: str,
    body: MentorApplicationReviewDecision,
    user: AuthenticatedUser = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MentorApplication).where(
            MentorApplication.id == application_id,
            MentorApplication.deleted_at.is_(None),
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidature introuvable")
    app = await review_application(db, app, body, user.user_id)
    return success_response(MentorApplicationRead.model_validate(app).model_dump())


@router.get("/{application_id}/classes", response_model=dict)
async def get_application_classes(
    application_id: str,
    user: AuthenticatedUser = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MiraClass).where(
            MiraClass.application_id == application_id,
            MiraClass.deleted_at.is_(None),
        )
    )
    classes = result.scalars().all()
    return success_response([MiraClassRead.model_validate(c).model_dump() for c in classes])
