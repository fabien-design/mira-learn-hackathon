"""Schemas Pydantic — MentorRatingBreakdown (lecture seule en hackathon)."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class MentorRatingBreakdownRead(BaseModel):
    profile_id: str
    axis_pedagogy: Optional[Decimal]
    axis_presence: Optional[Decimal]
    axis_deliverable: Optional[Decimal]
    axis_community: Optional[Decimal]
    trend_3m_vs_6m_pct: Optional[Decimal]
    rating_count: int
    last_review_at: Optional[datetime]
    computed_at: datetime

    model_config = ConfigDict(from_attributes=True)
