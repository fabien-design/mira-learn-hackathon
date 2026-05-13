"""Endpoints — Suggestions IA de Mira Classes."""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, require_auth
from app.core.db import get_db
from app.core.responses import success_response
from app.schemas.mira_class import MiraClassRead
from app.schemas.mira_class_ai_suggestion import (
    AdoptSuggestionRequest,
    GenerateSuggestionsRequest,
    MiraClassAISuggestionRead,
    RejectSuggestionRequest,
)
from app.services import ai_suggestion_service

router = APIRouter(
    prefix="/mentors/applications/me/class-suggestions",
    tags=["mira-class-ai-suggestions"],
)


def _serialize(instance) -> dict:
    return MiraClassAISuggestionRead.model_validate(instance).model_dump(mode="json")


@router.post("/generate", status_code=status.HTTP_201_CREATED, summary="Générer N suggestions IA")
async def generate_suggestions(
    body: GenerateSuggestionsRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    rows = await ai_suggestion_service.generate(
        db, user.user_id, body.count, body.exclude_suggestion_ids
    )
    return success_response(
        [_serialize(r) for r in rows], message="Suggestions générées"
    )


@router.get("", summary="Lister mes suggestions IA")
async def list_suggestions(
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    rows = await ai_suggestion_service.list_for_user(db, user.user_id, status_filter)
    return success_response([_serialize(r) for r in rows])


@router.get("/{suggestion_id}", summary="Détail d'une suggestion")
async def get_suggestion(
    suggestion_id: str,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    row = await ai_suggestion_service.get_for_user(db, user.user_id, suggestion_id)
    return success_response(_serialize(row))


@router.post("/{suggestion_id}/adopt", summary="Adopter une suggestion (crée une mira_class)")
async def adopt_suggestion(
    suggestion_id: str,
    body: AdoptSuggestionRequest | None = None,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    mc = await ai_suggestion_service.adopt(db, user.user_id, suggestion_id)
    return success_response(
        MiraClassRead.model_validate(mc).model_dump(mode="json"),
        message="Suggestion adoptée",
    )


@router.post("/{suggestion_id}/reject", summary="Rejeter une suggestion")
async def reject_suggestion(
    suggestion_id: str,
    body: RejectSuggestionRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_auth),
):
    row = await ai_suggestion_service.reject(db, user.user_id, suggestion_id, body.reason)
    return success_response(_serialize(row), message="Suggestion rejetée")
