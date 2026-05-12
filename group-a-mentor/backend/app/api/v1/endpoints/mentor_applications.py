"""
Routes candidature mentor — étape 1 (identité).

Conventions Hello Mira :
    - Routes → services uniquement (aucune logique métier ici)
    - Toutes les réponses JSend via success_response / fail_response
    - Auth via require_auth (any authenticated user)

MIGRATION HINT (post-hackathon) :
    require_auth → require_scope("mentors:write:own")
    Prefix /v1/mentors/applications → service backbone mentors-api
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, require_auth
from app.core.db import get_db
from app.core.responses import success_response
from app.schemas.mentor_application import MentorApplicationRead, MentorApplicationStep1
from app.services import mentor_application_service

router = APIRouter()


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Créer une candidature (étape 1 — identité)",
)
async def create_application(
    body: MentorApplicationStep1,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
) -> dict:
    """Crée une candidature en status='draft' avec les données d'identité.

    **Auth** : tout utilisateur authentifié.
    **Réponse JSend** : `{status: success, data: MentorApplicationRead}`.
    """
    instance = await mentor_application_service.create_draft(db, user.user_id, body)
    return success_response(
        data=MentorApplicationRead.model_validate(instance).model_dump(mode="json"),
        message="Candidature créée",
    )


@router.get("/me", summary="Ma candidature en cours")
async def get_my_application(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
) -> dict:
    """Retourne la candidature active du user authentifié (draft/submitted/in_review).

    Retourne `data: null` si aucune candidature active.
    """
    instance = await mentor_application_service.get_my_application(db, user.user_id)
    if not instance:
        return success_response(data=None, message="Aucune candidature active")
    return success_response(
        data=MentorApplicationRead.model_validate(instance).model_dump(mode="json")
    )


@router.patch("/me", summary="Mettre à jour l'étape 1 (identité)")
async def update_my_step1(
    body: MentorApplicationStep1,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
) -> dict:
    """Met à jour les champs d'identité — uniquement si status='draft'."""
    instance = await mentor_application_service.update_step1(db, user.user_id, body)
    return success_response(
        data=MentorApplicationRead.model_validate(instance).model_dump(mode="json"),
        message="Candidature mise à jour",
    )
