from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

ApplicationStatus = Literal["draft", "submitted", "in_review", "validated", "rejected"]


class MentorApplicationStep1(BaseModel):
    """Body pour POST /v1/mentors/applications + PATCH .../me — Étape 1 (identité)."""

    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(..., min_length=1, max_length=80)
    nomad_since_year: Optional[int] = Field(None, ge=2000, le=2030)
    prior_masterclasses_count: int = Field(default=0, ge=0)


class MentorApplicationReviewDecision(BaseModel):
    """Body pour POST /v1/admin/mentors/applications/{id}/review — Décision admin."""

    decision: Literal["validated", "rejected"]
    decision_reason: Optional[str] = Field(None, max_length=2000)


class MentorApplicationRead(BaseModel):
    """Réponse lecture — vue authentifiée complète de la candidature."""

    id: str
    user_id: str
    status: ApplicationStatus
    first_name: str
    last_name: str
    nomad_since_year: Optional[int]
    prior_masterclasses_count: int
    submitted_at: Optional[datetime]
    reviewed_at: Optional[datetime]
    reviewed_by_admin_id: Optional[str]
    decision_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
