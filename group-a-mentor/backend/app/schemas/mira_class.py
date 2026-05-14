"""Schemas Pydantic — MiraClass."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.config import settings

MiraClassStatus = Literal[
    "draft", "submitted", "in_review", "validated_draft",
    "enrichment_in_progress", "published", "rejected", "archived"
]
ClassFormat = Literal["physical", "virtual", "both"]
RythmPattern = Literal[
    "weekly_session", "biweekly_session", "monthly_workshop",
    "intensive_weekend", "self_paced"
]


class TargetCity(BaseModel):
    name: str = Field(..., max_length=120)
    country_code: str = Field(..., min_length=2, max_length=2)


class MiraClassBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: str = Field(default="", max_length=10000)
    skills_taught: list[str] = []
    total_hours_collective: int = Field(default=0, ge=0)
    total_hours_individual: int = Field(default=0, ge=0)
    total_hours: int = Field(default=0, ge=0)
    format_envisaged: ClassFormat = "both"
    rythm_pattern: Optional[RythmPattern] = None
    target_cities: list[TargetCity] = []
    recommended_price_per_hour_collective_cents: int = Field(default=0, ge=0)
    recommended_price_per_hour_individual_cents: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def _check_total_hours(self) -> "MiraClassBase":
        # Only validate when total_hours is explicitly provided (non-zero).
        # Allows partial saves where only collective/individual are set first.
        if self.total_hours > 0:
            expected = self.total_hours_collective + self.total_hours_individual
            if self.total_hours != expected:
                raise ValueError(
                    f"total_hours ({self.total_hours}) doit être égal à "
                    f"total_hours_collective + total_hours_individual ({expected})"
                )
        return self


class MiraClassCreate(MiraClassBase):
    """Création pendant candidature. status='draft' implicite."""
    application_id: Optional[str] = None
    ai_assisted: bool = False
    source_suggestion_id: Optional[str] = None


class MiraClassUpdate(BaseModel):
    """Update partiel (Group A en draft)."""
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=10000)
    skills_taught: Optional[list[str]] = None
    total_hours_collective: Optional[int] = Field(None, ge=0)
    total_hours_individual: Optional[int] = Field(None, ge=0)
    total_hours: Optional[int] = Field(None, ge=0)
    format_envisaged: Optional[ClassFormat] = None
    rythm_pattern: Optional[RythmPattern] = None
    target_cities: Optional[list[TargetCity]] = None
    recommended_price_per_hour_collective_cents: Optional[int] = Field(None, ge=0)
    recommended_price_per_hour_individual_cents: Optional[int] = Field(None, ge=0)


class MiraClassRead(MiraClassBase):
    id: str
    application_id: Optional[str]
    mentor_user_id: str
    status: MiraClassStatus
    rejection_reason: Optional[str]
    ai_assisted: bool
    source_suggestion_id: Optional[str]
    submitted_at: Optional[datetime]
    validated_at: Optional[datetime]
    published_at: Optional[datetime]
    archived_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RevenueSimulationRequest(BaseModel):
    """Simulation revenu calculée à la volée (non stockée)."""
    hours_collective: int = Field(..., ge=0)
    hours_individual: int = Field(..., ge=0)
    rate_collective_cents: int = Field(..., ge=0)
    rate_individual_cents: int = Field(..., ge=0)


class RevenueSimulationResult(BaseModel):
    gross_revenue_cents: int
    platform_fee_cents: int
    mentor_net_cents: int
    platform_fee_pct: float = Field(default_factory=lambda: settings.PLATFORM_FEE_RATIO)
