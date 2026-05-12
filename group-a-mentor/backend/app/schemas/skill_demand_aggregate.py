"""Schemas Pydantic — SkillDemandAggregate (lecture seule, consommé par AI suggestions)."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class SkillDemandAggregateRead(BaseModel):
    skill_id: str
    students_wanting_count: int = Field(..., ge=0)
    mentors_offering_count: int = Field(..., ge=0)
    active_classes_count: int = Field(..., ge=0)
    gap_score: Decimal
    period_label: str
    computed_at: datetime

    model_config = ConfigDict(from_attributes=True)
