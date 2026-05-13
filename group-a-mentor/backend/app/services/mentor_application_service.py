"""Service couche métier — mentor_application + cycle de soumission/review."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.mentor_application import MentorApplication
from app.models.mentor_application_skill import MentorApplicationSkill
from app.models.mira_class import MiraClass
from app.schemas.mentor_application import (
    MentorApplicationProfile,
    MentorApplicationReviewDecision,
    MentorApplicationStep1,
)


async def get_my_application(db: AsyncSession, user_id: str) -> MentorApplication | None:
    """Candidature active du user (status draft/submitted/in_review)."""
    stmt = select(MentorApplication).where(
        MentorApplication.user_id == user_id,
        MentorApplication.deleted_at.is_(None),
        MentorApplication.status.in_(["draft", "submitted", "in_review"]),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_any_application_for_user(db: AsyncSession, user_id: str) -> MentorApplication | None:
    """Dernière candidature (tout status, pas soft-deletée) — utile pour /me/application."""
    stmt = (
        select(MentorApplication)
        .where(
            MentorApplication.user_id == user_id,
            MentorApplication.deleted_at.is_(None),
        )
        .order_by(MentorApplication.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_draft(
    db: AsyncSession,
    user_id: str,
    body: MentorApplicationStep1,
) -> MentorApplication:
    existing = await get_my_application(db, user_id)
    if existing:
        raise ConflictError(
            "Une candidature active existe déjà pour cet utilisateur",
            data={"existing_id": existing.id, "status": existing.status},
        )

    instance = MentorApplication(
        user_id=user_id,
        status="draft",
        first_name=body.first_name,
        last_name=body.last_name,
        nomad_since_year=body.nomad_since_year,
        prior_masterclasses_count=body.prior_masterclasses_count,
    )
    db.add(instance)
    await db.flush()
    await db.refresh(instance)
    return instance


async def update_step1(
    db: AsyncSession,
    user_id: str,
    body: MentorApplicationStep1,
) -> MentorApplication:
    """Identité — modifiable uniquement en draft."""
    instance = await get_my_application(db, user_id)
    if not instance:
        raise NotFoundError("MentorApplication", user_id)
    if instance.status != "draft":
        raise ConflictError(
            f"Identité verrouillée après soumission (status='{instance.status}')",
            data={"status": instance.status},
        )

    instance.first_name = body.first_name
    instance.last_name = body.last_name
    instance.nomad_since_year = body.nomad_since_year
    instance.prior_masterclasses_count = body.prior_masterclasses_count
    await db.flush()
    await db.refresh(instance)
    return instance


async def update_profile(
    db: AsyncSession,
    user_id: str,
    body: MentorApplicationProfile,
) -> MentorApplication:
    """Profil pro (étape 3.2) — bio + parcours + pitch + motivation + liens."""
    instance = await get_my_application(db, user_id)
    if not instance:
        raise NotFoundError("MentorApplication", user_id)
    if instance.status != "draft":
        raise ConflictError(
            f"Candidature non modifiable (status='{instance.status}')",
            data={"status": instance.status},
        )

    instance.bio = body.bio
    instance.professional_journey = [e.model_dump() for e in body.professional_journey]
    instance.transmission_pitch = body.transmission_pitch
    instance.motivation = body.motivation
    instance.linkedin_url = body.linkedin_url
    instance.instagram_url = body.instagram_url
    instance.website_url = body.website_url
    await db.flush()
    await db.refresh(instance)
    return instance


async def submit_application(db: AsyncSession, user_id: str) -> MentorApplication:
    """Étape 7 — application + toutes ses mira_class draft passent en submitted."""
    instance = await get_my_application(db, user_id)
    if not instance:
        raise NotFoundError("MentorApplication", user_id)
    if instance.status != "draft":
        raise ConflictError(
            f"Soumission impossible (status='{instance.status}')",
            data={"status": instance.status},
        )

    if not instance.first_name or not instance.last_name:
        raise ValidationError("Identité incomplète (étape 1).", field="first_name")

    classes_stmt = select(MiraClass).where(
        MiraClass.application_id == instance.id,
        MiraClass.status == "draft",
        MiraClass.deleted_at.is_(None),
    )
    classes = list((await db.execute(classes_stmt)).scalars().all())
    if not classes:
        raise ValidationError(
            "Au moins une mira_class draft est requise pour soumettre.",
            field="classes",
        )

    skills_stmt = select(MentorApplicationSkill).where(
        MentorApplicationSkill.application_id == instance.id
    )
    if not (await db.execute(skills_stmt)).scalars().first():
        raise ValidationError("Au moins une skill déclarée est requise.", field="skills")

    now = datetime.now(timezone.utc)
    instance.status = "submitted"
    instance.submitted_at = now
    for mc in classes:
        mc.status = "submitted"
        mc.submitted_at = now

    await db.flush()
    await db.refresh(instance)
    return instance


async def delete_my_draft(db: AsyncSession, user_id: str) -> None:
    """Soft delete d'une candidature draft."""
    instance = await get_my_application(db, user_id)
    if not instance:
        raise NotFoundError("MentorApplication", user_id)
    if instance.status != "draft":
        raise ConflictError(
            f"Seule une candidature draft peut être supprimée (status='{instance.status}')",
            data={"status": instance.status},
        )
    instance.deleted_at = datetime.now(timezone.utc)
    await db.flush()


async def review_application(
    db: AsyncSession,
    instance: MentorApplication,
    decision_body: MentorApplicationReviewDecision,
    admin_user_id: str,
) -> MentorApplication:
    """Décision admin sur une candidature submitted/in_review.

    - decision='in_review' : pré-marquage (admin a ouvert le dossier).
    - decision='validated' : crée mentor_profile, applique class_decisions.
    - decision='rejected'  : decision_reason obligatoire ; aucune class promue.
    """
    if instance.status not in ("submitted", "in_review"):
        raise ConflictError(
            f"Review impossible (status='{instance.status}')",
            data={"status": instance.status},
        )
    if decision_body.decision == "rejected" and not (decision_body.decision_reason or "").strip():
        raise ValidationError(
            "decision_reason est obligatoire en cas de refus.",
            field="decision_reason",
        )

    now = datetime.now(timezone.utc)

    if decision_body.decision == "in_review":
        instance.status = "in_review"
        await db.flush()
        await db.refresh(instance)
        return instance

    instance.status = decision_body.decision  # validated | rejected
    instance.reviewed_at = now
    instance.reviewed_by_admin_id = admin_user_id
    instance.decision_reason = decision_body.decision_reason

    classes_stmt = select(MiraClass).where(
        MiraClass.application_id == instance.id,
        MiraClass.deleted_at.is_(None),
    )
    classes = list((await db.execute(classes_stmt)).scalars().all())
    decisions_by_id = {d.class_id: d for d in decision_body.class_decisions}

    if decision_body.decision == "rejected":
        reason = decision_body.decision_reason or "Candidature refusée"
        for mc in classes:
            if mc.status in ("draft", "submitted", "in_review"):
                mc.status = "rejected"
                mc.rejection_reason = reason
        await db.flush()
        await db.refresh(instance)
        return instance

    # decision == 'validated'
    from app.services import mentor_profile_service

    await mentor_profile_service.create_from_application(db, instance)

    for mc in classes:
        d = decisions_by_id.get(mc.id)
        if d and d.decision == "rejected":
            mc.status = "rejected"
            mc.rejection_reason = d.rejection_reason or "Class refusée par l'admin"
        else:
            mc.status = "validated_draft"
            mc.validated_at = now

    await db.flush()
    await db.refresh(instance)
    return instance


async def list_classes_for_application(
    db: AsyncSession, application_id: str
) -> list[MiraClass]:
    stmt = select(MiraClass).where(
        MiraClass.application_id == application_id,
        MiraClass.deleted_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())
