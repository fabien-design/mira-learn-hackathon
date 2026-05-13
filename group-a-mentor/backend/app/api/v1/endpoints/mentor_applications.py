"""Routes candidature mentor (tunnel + suivi).

Conventions Hello Mira :
    - Routes → services uniquement (aucune logique métier ici)
    - Toutes les réponses JSend via success_response / fail_response
    - Auth via require_auth (any authenticated user)
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, require_auth
from app.core.db import get_db
from app.core.responses import success_response
from app.schemas.mentor_application import (
    MentorApplicationProfile,
    MentorApplicationRead,
    MentorApplicationStep1,
)
from app.services import mentor_application_service

router = APIRouter()


def _serialize(instance) -> dict:
    return MentorApplicationRead.model_validate(instance).model_dump(mode="json")


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
    instance = await mentor_application_service.create_draft(db, user.user_id, body)
    return success_response(data=_serialize(instance), message="Candidature créée")


@router.get("/me", summary="Ma candidature en cours")
async def get_my_application(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
) -> dict:
    instance = await mentor_application_service.get_any_application_for_user(
        db, user.user_id
    )
    if not instance:
        return success_response(data=None, message="Aucune candidature active")
    return success_response(data=_serialize(instance))


@router.patch("/me", summary="Mettre à jour l'étape 1 (identité)")
async def update_my_step1(
    body: MentorApplicationStep1,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
) -> dict:
    instance = await mentor_application_service.update_step1(db, user.user_id, body)
    return success_response(data=_serialize(instance), message="Candidature mise à jour")


@router.patch("/me/profile", summary="Mettre à jour le profil pro (étape 3.2)")
async def update_my_profile(
    body: MentorApplicationProfile,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
) -> dict:
    instance = await mentor_application_service.update_profile(db, user.user_id, body)
    return success_response(data=_serialize(instance), message="Profil mis à jour")


@router.post("/me/submit", summary="Soumettre ma candidature (étape 7)")
async def submit_my_application(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
) -> dict:
    instance = await mentor_application_service.submit_application(db, user.user_id)
    return success_response(data=_serialize(instance), message="Candidature soumise")


@router.delete("/me", summary="Annuler ma candidature (draft uniquement)")
async def delete_my_application(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
) -> dict:
    await mentor_application_service.delete_my_draft(db, user.user_id)
    return success_response(data=None, message="Candidature annulée")
