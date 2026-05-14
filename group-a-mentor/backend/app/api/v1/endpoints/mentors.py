"""Endpoints — Mentors publics (annuaire + fiche détail) + privé (/me)."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, require_role
from app.core.db import get_db
from app.core.responses import success_response
from app.models.mentor_profile import MentorProfile
from app.models.mentor_profile_skill import MentorProfileSkill
from app.models.mira_class import MiraClass
from app.models.skill import Skill
from app.schemas.mentor_profile import MentorProfilePublic, MentorProfileRead, MentorProfileSkillPublic, MentorProfileUpdate

router = APIRouter(prefix="/mentors", tags=["mentors"])


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------

@router.get("", response_model=dict)
async def list_mentors(
    skill_id: str | None = Query(None),
    search: str | None = Query(None),
    sort: str | None = Query("rating", pattern="^(rating|classes_count|alphabetical)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    q = select(MentorProfile).where(
        MentorProfile.status == "active",
        MentorProfile.deleted_at.is_(None),
    )
    if search:
        # HACKATHON: ILIKE on unindexed display_name/headline columns — full table scan.
        # Identified by code review — skipped due to hackathon scale (~20 profiles).
        # Fix post-hackathon: add GIN trigram indexes (pg_trgm) on both columns.
        q = q.where(
            MentorProfile.display_name.ilike(f"%{search}%")
            | MentorProfile.headline.ilike(f"%{search}%")
        )
    if skill_id:
        # Filtre par skill via join mentor_profile_skill
        skill_profile_ids = select(MentorProfileSkill.profile_id).where(
            MentorProfileSkill.skill_id == skill_id
        )
        q = q.where(MentorProfile.id.in_(skill_profile_ids))

    if sort == "rating":
        q = q.order_by(MentorProfile.aggregate_rating.desc().nulls_last())
    elif sort == "classes_count":
        q = q.order_by(MentorProfile.classes_given_count.desc())
    else:
        q = q.order_by(MentorProfile.display_name.asc())

    q = q.offset(offset).limit(limit)
    result = await db.execute(q)
    profiles = result.scalars().all()
    return success_response([MentorProfilePublic.model_validate(p).model_dump() for p in profiles])


@router.get("/me", response_model=dict)
async def get_my_profile(
    user: AuthenticatedUser = Depends(require_role("mentor", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MentorProfile).where(
            MentorProfile.user_id == user.user_id,
            MentorProfile.deleted_at.is_(None),
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fiche mentor introuvable")
    return success_response(MentorProfileRead.model_validate(profile).model_dump())


@router.patch("/me", response_model=dict)
async def update_my_profile(
    body: MentorProfileUpdate,
    user: AuthenticatedUser = Depends(require_role("mentor", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MentorProfile).where(
            MentorProfile.user_id == user.user_id,
            MentorProfile.deleted_at.is_(None),
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fiche mentor introuvable")
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return success_response(MentorProfileRead.model_validate(profile).model_dump())


@router.get("/{slug}", response_model=dict)
async def get_mentor_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MentorProfile).where(
            MentorProfile.slug == slug,
            MentorProfile.status == "active",
            MentorProfile.deleted_at.is_(None),
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor introuvable")

    skills_result = await db.execute(
        select(MentorProfileSkill, Skill)
        .join(Skill, Skill.id == MentorProfileSkill.skill_id)
        .where(MentorProfileSkill.profile_id == profile.id)
        .order_by(MentorProfileSkill.is_primary.desc(), MentorProfileSkill.display_order.asc())
    )
    skill_rows = skills_result.all()
    skills = [
        MentorProfileSkillPublic(
            skill_id=mps.skill_id,
            skill_name=s.name,
            skill_slug=s.slug,
            level=mps.level,
            is_primary=mps.is_primary,
            display_order=mps.display_order,
            category=s.category,
        ).model_dump()
        for mps, s in skill_rows
    ]

    data = MentorProfilePublic.model_validate(profile).model_dump()
    data["skills"] = skills
    return success_response(data)


@router.get("/{slug}/classes", response_model=dict)
async def get_mentor_classes(slug: str, db: AsyncSession = Depends(get_db)):
    # Récupère d'abord le mentor_profile pour avoir user_id
    profile_result = await db.execute(
        select(MentorProfile).where(
            MentorProfile.slug == slug,
            MentorProfile.status == "active",
            MentorProfile.deleted_at.is_(None),
        )
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor introuvable")

    classes_result = await db.execute(
        select(MiraClass).where(
            MiraClass.mentor_user_id == profile.user_id,
            MiraClass.status == "published",
            MiraClass.deleted_at.is_(None),
        ).order_by(MiraClass.published_at.desc())
    )
    from app.schemas.mira_class import MiraClassRead
    classes = classes_result.scalars().all()
    return success_response([MiraClassRead.model_validate(c).model_dump() for c in classes])
