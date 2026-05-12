"""Schemas Pydantic — MiraClassAISuggestion."""
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class SuggestedModuleOutline(BaseModel):
    position: int = Field(..., ge=1)
    title: str = Field(..., max_length=200)
    estimated_duration_hours: Decimal = Field(..., gt=0)


class MiraClassAISuggestionRead(BaseModel):
    id: str
    application_id: str
    suggested_title: str
    suggested_description: str
    suggested_skill_ids: list[str]
    suggested_outline: list[SuggestedModuleOutline]
    suggested_total_hours: int
    suggested_format: Literal["physical", "virtual", "both"]
    justification: str
    skill_demand_score: Decimal
    skill_offer_gap_score: Decimal
    status: Literal["proposed", "adopted", "rejected", "modified"]
    adopted_into_class_id: Optional[str]
    rejected_at: Optional[datetime]
    rejected_reason: Optional[str]
    llm_model_used: str
    generated_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GenerateSuggestionsRequest(BaseModel):
    """Déclenche la génération de N suggestions IA."""
    count: int = Field(default=3, ge=1, le=5)
    exclude_suggestion_ids: list[str] = []


class AdoptSuggestionRequest(BaseModel):
    """Adopter une suggestion → crée une MiraClass en draft."""
    modify_before_adopting: bool = False


class RejectSuggestionRequest(BaseModel):
    """Rejeter une suggestion."""
    reason: Literal[
        "not_my_expertise", "not_interested", "too_generic", "duplicate", "other"
    ] = "other"
