"""Service métier — mentor_profile (créé à la validation candidature)."""
from __future__ import annotations

from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mentor_application import MentorApplication
from app.models.mentor_application_skill import MentorApplicationSkill
from app.models.mentor_profile import MentorProfile
from app.models.mentor_profile_skill import MentorProfileSkill


async def generate_unique_slug(db: AsyncSession, first_name: str, last_name: str) -> str:
    """Slug `prenom-nom`, suffixé `-N` si conflit (case-insensitive sur slug)."""
    base = slugify(f"{first_name} {last_name}") or "mentor"
    candidate = base
    counter = 1
    while True:
        existing = await db.execute(
            select(MentorProfile.id).where(MentorProfile.slug == candidate)
        )
        if existing.scalar_one_or_none() is None:
            return candidate
        counter += 1
        candidate = f"{base}-{counter}"


def _truncate(text: str, n: int) -> str:
    return (text or "")[:n]


async def create_from_application(
    db: AsyncSession, application: MentorApplication
) -> MentorProfile:
    """Crée mentor_profile + reporte mentor_application_skill → mentor_profile_skill."""
    # Idempotence : si déjà un profile pour ce user, on retourne l'existant
    existing = await db.execute(
        select(MentorProfile).where(
            MentorProfile.user_id == application.user_id,
            MentorProfile.deleted_at.is_(None),
        )
    )
    found = existing.scalar_one_or_none()
    if found:
        return found

    slug = await generate_unique_slug(db, application.first_name, application.last_name)

    profile = MentorProfile(
        user_id=application.user_id,
        slug=slug,
        display_name=f"{application.first_name} {application.last_name}".strip(),
        headline=_truncate(application.transmission_pitch, 255),
        bio=application.bio or "",
        professional_journey=list(application.professional_journey or []),
        linkedin_url=application.linkedin_url,
        instagram_url=application.instagram_url,
        website_url=application.website_url,
        status="active",
    )
    db.add(profile)
    await db.flush()
    await db.refresh(profile)

    # Reprise des skills de la candidature → fiche
    app_skills = (
        await db.execute(
            select(MentorApplicationSkill).where(
                MentorApplicationSkill.application_id == application.id
            )
        )
    ).scalars().all()

    # Top 3 expert/advanced en primary (ordre = ordre d'apparition)
    primary_quota = 3
    primaries_picked = 0
    for idx, app_skill in enumerate(app_skills):
        is_primary = (
            primaries_picked < primary_quota
            and app_skill.level in ("expert", "advanced")
        )
        if is_primary:
            primaries_picked += 1
        db.add(
            MentorProfileSkill(
                profile_id=profile.id,
                skill_id=app_skill.skill_id,
                level=app_skill.level,
                is_primary=is_primary,
                display_order=idx,
            )
        )
    await db.flush()
    return profile
