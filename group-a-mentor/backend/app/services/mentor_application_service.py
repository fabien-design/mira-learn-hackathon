from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from app.core.exceptions import ConflictError, NotFoundError
from app.models.mentor_application import MentorApplication
from app.schemas.mentor_application import MentorApplicationStep1


async def get_my_application(db: AsyncSession, user_id: str) -> MentorApplication | None:
    """Récupère la candidature active du user (status draft/submitted/in_review)."""
    stmt = select(MentorApplication).where(
        MentorApplication.user_id == user_id,
        MentorApplication.deleted_at.is_(None),
        MentorApplication.status.in_(["draft", "submitted", "in_review"]),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_draft(
    db: AsyncSession,
    user_id: str,
    body: MentorApplicationStep1,
) -> MentorApplication:
    """Crée une candidature en status='draft' avec les données de l'étape 1."""
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
    # WHY : server_default (created_at, updated_at) ne sont pas toujours
    # chargés par asyncpg après flush() — refresh() fait un SELECT RETURNING
    # pour garantir que tous les champs sont présents avant la sérialisation.
    await db.refresh(instance)
    return instance


async def update_step1(
    db: AsyncSession,
    user_id: str,
    body: MentorApplicationStep1,
) -> MentorApplication:
    """Met à jour les champs d'identité (étape 1) — seulement si status='draft'."""
    instance = await get_my_application(db, user_id)
    if not instance:
        raise NotFoundError("MentorApplication", user_id)
    if instance.status != "draft":
        raise ConflictError(
            f"Impossible de modifier une candidature en status '{instance.status}'",
            data={"status": instance.status},
        )

    instance.first_name = body.first_name
    instance.last_name = body.last_name
    instance.nomad_since_year = body.nomad_since_year
    instance.prior_masterclasses_count = body.prior_masterclasses_count
    await db.flush()
    await db.refresh(instance)
    return instance


async def review_application(
    db: AsyncSession,
    instance: MentorApplication,
    decision_body,
    admin_user_id: str,
) -> MentorApplication:
    """Valide ou rejette une candidature en status='submitted' ou 'in_review'."""
    if instance.status not in ["submitted", "in_review"]:
        raise ConflictError(
            f"Impossible de reviewer une candidature en status '{instance.status}'",
            data={"status": instance.status},
        )

    if decision_body.decision == "validated":
        instance.status = "validated"
    elif decision_body.decision == "rejected":
        instance.status = "rejected"
        instance.decision_reason = decision_body.decision_reason
    
    instance.reviewed_at = datetime.now(timezone.utc)
    instance.reviewed_by_admin_id = admin_user_id
    if decision_body.decision_reason and decision_body.decision == "rejected":
        instance.decision_reason = decision_body.decision_reason
    
    await db.flush()
    await db.refresh(instance)
    return instance
