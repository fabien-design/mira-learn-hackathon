"""Service métier — mentor_application_skill (skills déclarées par le candidat)."""
from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.mentor_application_skill import MentorApplicationSkill
from app.models.skill import Skill
from app.schemas.mentor_application_skill import MentorApplicationSkillBase
from app.services.mentor_application_service import get_my_application


async def list_for_user(
    db: AsyncSession, user_id: str
) -> list[MentorApplicationSkill]:
    app = await get_my_application(db, user_id)
    if not app:
        return []
    stmt = select(MentorApplicationSkill).where(
        MentorApplicationSkill.application_id == app.id
    )
    return list((await db.execute(stmt)).scalars().all())


async def set_all(
    db: AsyncSession,
    user_id: str,
    skills: list[MentorApplicationSkillBase],
) -> list[MentorApplicationSkill]:
    """PUT — remplace toutes les skills déclarées."""
    app = await get_my_application(db, user_id)
    if not app:
        raise NotFoundError("MentorApplication", user_id)
    if app.status not in ("draft", "submitted"):
        raise ConflictError(
            f"Skills non modifiables (status='{app.status}')",
            data={"status": app.status},
        )

    await db.execute(
        delete(MentorApplicationSkill).where(
            MentorApplicationSkill.application_id == app.id
        )
    )

    # Validate all skill_ids exist in catalogue (no DB FK — must check manually)
    input_ids = list({s.skill_id for s in skills})
    if input_ids:
        valid_ids = set(
            (
                await db.execute(
                    select(Skill.id).where(
                        Skill.id.in_(input_ids),
                        Skill.deleted_at.is_(None),
                    )
                )
            ).scalars().all()
        )
        invalid = [sid for sid in input_ids if sid not in valid_ids]
        if invalid:
            raise ValidationError(
                f"skill_id(s) inconnu(s) : {', '.join(invalid)}", field="skill_id"
            )

    # Dédup côté entrée (la contrainte SQL UNIQUE le ferait sauter sinon)
    seen: set[str] = set()
    rows: list[MentorApplicationSkill] = []
    for s in skills:
        if s.skill_id in seen:
            continue
        seen.add(s.skill_id)
        row = MentorApplicationSkill(
            application_id=app.id,
            skill_id=s.skill_id,
            level=s.level,
            self_declared=s.self_declared,
            validated_via_cv_import=s.validated_via_cv_import,
        )
        db.add(row)
        rows.append(row)
    await db.flush()
    return rows


async def add_one(
    db: AsyncSession,
    user_id: str,
    body: MentorApplicationSkillBase,
) -> MentorApplicationSkill:
    app = await get_my_application(db, user_id)
    if not app:
        raise NotFoundError("MentorApplication", user_id)
    if app.status not in ("draft", "submitted"):
        raise ConflictError(
            f"Skills non modifiables (status='{app.status}')",
            data={"status": app.status},
        )

    skill_exists = (
        await db.execute(
            select(Skill.id).where(Skill.id == body.skill_id, Skill.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if not skill_exists:
        raise ValidationError(f"skill_id inconnu : {body.skill_id}", field="skill_id")

    existing = await db.execute(
        select(MentorApplicationSkill).where(
            MentorApplicationSkill.application_id == app.id,
            MentorApplicationSkill.skill_id == body.skill_id,
        )
    )
    found = existing.scalar_one_or_none()
    if found:
        found.level = body.level
        found.self_declared = body.self_declared
        found.validated_via_cv_import = body.validated_via_cv_import
        await db.flush()
        return found

    row = MentorApplicationSkill(
        application_id=app.id,
        skill_id=body.skill_id,
        level=body.level,
        self_declared=body.self_declared,
        validated_via_cv_import=body.validated_via_cv_import,
    )
    db.add(row)
    await db.flush()
    return row


async def remove_one(db: AsyncSession, user_id: str, skill_id: str) -> None:
    app = await get_my_application(db, user_id)
    if not app:
        raise NotFoundError("MentorApplication", user_id)
    if app.status not in ("draft", "submitted"):
        raise ConflictError(
            f"Skills non modifiables (status='{app.status}')",
            data={"status": app.status},
        )
    await db.execute(
        delete(MentorApplicationSkill).where(
            MentorApplicationSkill.application_id == app.id,
            MentorApplicationSkill.skill_id == skill_id,
        )
    )
    await db.flush()
