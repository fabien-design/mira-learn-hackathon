"""Endpoints — MiraClass (propositions pendant candidature + simulation revenu)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, require_role
from app.core.config import settings
from app.core.db import get_db
from app.core.responses import success_response
from app.models.mira_class import MiraClass
from app.schemas.mira_class import (
    MiraClassCreate,
    MiraClassRead,
    MiraClassUpdate,
    RevenueSimulationRequest,
    RevenueSimulationResult,
)
from app.services.mentor_application_service import get_my_application

router = APIRouter(prefix="/mentors/applications/me/classes", tags=["mira-classes"])
revenue_router = APIRouter(prefix="/mentors", tags=["mira-classes"])


async def _get_application_or_404(db: AsyncSession, user_id: str):
    app = await get_my_application(db, user_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aucune candidature en cours")
    return app


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_class(
    body: MiraClassCreate,
    user: AuthenticatedUser = Depends(require_role("nomad", "mentor", "admin")),
    db: AsyncSession = Depends(get_db),
):
    app = await _get_application_or_404(db, user.user_id)
    payload = body.model_dump(exclude={"application_id"})
    mc = MiraClass(
        application_id=app.id,
        mentor_user_id=user.user_id,
        status="draft",
        **payload,
    )
    db.add(mc)
    await db.commit()
    await db.refresh(mc)
    return success_response(MiraClassRead.model_validate(mc).model_dump())


@router.get("", response_model=dict)
async def list_classes(
    user: AuthenticatedUser = Depends(require_role("nomad", "mentor", "admin")),
    db: AsyncSession = Depends(get_db),
):
    app = await _get_application_or_404(db, user.user_id)
    result = await db.execute(
        select(MiraClass).where(
            MiraClass.application_id == app.id,
            MiraClass.deleted_at.is_(None),
        )
    )
    classes = result.scalars().all()
    return success_response([MiraClassRead.model_validate(c).model_dump() for c in classes])


@router.get("/{class_id}", response_model=dict)
async def get_class(
    class_id: str,
    user: AuthenticatedUser = Depends(require_role("nomad", "mentor", "admin")),
    db: AsyncSession = Depends(get_db),
):
    app = await _get_application_or_404(db, user.user_id)
    result = await db.execute(
        select(MiraClass).where(
            MiraClass.id == class_id,
            MiraClass.application_id == app.id,
            MiraClass.deleted_at.is_(None),
        )
    )
    mc = result.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classe introuvable")
    return success_response(MiraClassRead.model_validate(mc).model_dump())


@router.patch("/{class_id}", response_model=dict)
async def update_class(
    class_id: str,
    body: MiraClassUpdate,
    user: AuthenticatedUser = Depends(require_role("nomad", "mentor", "admin")),
    db: AsyncSession = Depends(get_db),
):
    app = await _get_application_or_404(db, user.user_id)
    result = await db.execute(
        select(MiraClass).where(
            MiraClass.id == class_id,
            MiraClass.application_id == app.id,
            MiraClass.deleted_at.is_(None),
        )
    )
    mc = result.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classe introuvable")
    if mc.status != "draft":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Classe non éditable (status != draft)")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(mc, field, value)
    await db.commit()
    await db.refresh(mc)
    return success_response(MiraClassRead.model_validate(mc).model_dump())


@router.delete("/{class_id}", response_model=dict)
async def delete_class(
    class_id: str,
    user: AuthenticatedUser = Depends(require_role("nomad", "mentor", "admin")),
    db: AsyncSession = Depends(get_db),
):
    app = await _get_application_or_404(db, user.user_id)
    result = await db.execute(
        select(MiraClass).where(
            MiraClass.id == class_id,
            MiraClass.application_id == app.id,
            MiraClass.deleted_at.is_(None),
        )
    )
    mc = result.scalar_one_or_none()
    if not mc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classe introuvable")
    if mc.status != "draft":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Seules les classes draft peuvent être supprimées")
    mc.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return success_response(None, message="Classe supprimée")


# ---------------------------------------------------------------------------
# Simulation revenu (calcul à la volée, pas de persistence)
# ---------------------------------------------------------------------------

@revenue_router.post("/revenue-simulation", response_model=dict)
async def simulate_revenue(body: RevenueSimulationRequest):
    gross = (
        body.hours_collective * body.rate_collective_cents
        + body.hours_individual * body.rate_individual_cents
    )
    fee = int(gross * settings.PLATFORM_FEE_RATIO)
    net = gross - fee
    return success_response(
        RevenueSimulationResult(
            gross_revenue_cents=gross,
            platform_fee_cents=fee,
            mentor_net_cents=net,
        ).model_dump()
    )
