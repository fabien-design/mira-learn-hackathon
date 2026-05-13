"""Endpoints — Skills (catalogue + création custom)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, require_auth
from app.core.db import get_db
from app.core.responses import success_response
from app.models.skill import Skill
from app.schemas.skill import SkillCreate, SkillRead

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("", response_model=dict)
async def list_skills(
    category: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Skill).where(Skill.deleted_at.is_(None))
    if category:
        q = q.where(Skill.category == category)
    if search:
        q = q.where(Skill.name.ilike(f"%{search}%"))
    q = q.order_by(Skill.popularity_score.desc())
    result = await db.execute(q)
    skills = result.scalars().all()
    return success_response([SkillRead.model_validate(s).model_dump() for s in skills])


@router.post("", response_model=dict, status_code=201)
async def create_skill(
    body: SkillCreate,
    user: AuthenticatedUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    from slugify import slugify

    base_slug = slugify(body.name, max_length=60) or "skill"
    slug = base_slug
    counter = 1
    while True:
        exists = (
            await db.execute(select(Skill.id).where(Skill.slug == slug))
        ).scalar_one_or_none()
        if not exists:
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    skill = Skill(
        slug=slug,
        name=body.name.strip(),
        description=body.description,
        category=body.category,
        popularity_score=0,
    )
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return success_response(SkillRead.model_validate(skill).model_dump(), message="Skill créée")


@router.get("/{skill_id}", response_model=dict)
async def get_skill(skill_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Skill).where(Skill.id == skill_id, Skill.deleted_at.is_(None))
    )
    skill = result.scalar_one_or_none()
    if not skill:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill introuvable")
    return success_response(SkillRead.model_validate(skill).model_dump())
