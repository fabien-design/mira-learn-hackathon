from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

ApplicationStatus = Literal["draft", "submitted", "in_review", "validated", "rejected"]


class ProfessionalExperience(BaseModel):
    """Une étape du parcours professionnel.

    HACKATHON: duplicate of ProfessionalExperience in schemas/mentor_profile.py.
    Identified by code review — skipped due to hackathon timeline.
    Fix post-hackathon: extract to schemas/shared.py and import from both.
    """

    role: str = Field(..., max_length=120)
    company: str = Field(..., max_length=120)
    start_year: int = Field(..., ge=1970, le=2030)
    end_year: Optional[int] = Field(None, ge=1970, le=2030)
    description: str = Field(default="", max_length=2000)


class MentorApplicationStep1(BaseModel):
    """Body pour POST /v1/mentors/applications + PATCH .../me — Étape 1 (identité)."""

    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(..., min_length=1, max_length=80)
    nomad_since_year: Optional[int] = Field(None, ge=2000, le=2030)
    prior_masterclasses_count: int = Field(default=0, ge=0)


class MentorApplicationProfile(BaseModel):
    """Body PATCH .../me/profile — étape 3.2 (profil pro + liens externes)."""

    bio: str = Field(default="", max_length=10000)
    professional_journey: list[ProfessionalExperience] = []
    transmission_pitch: str = Field(default="", max_length=2000)
    motivation: str = Field(default="", max_length=2000)
    linkedin_url: Optional[str] = Field(None, max_length=255)
    instagram_url: Optional[str] = Field(None, max_length=255)
    website_url: Optional[str] = Field(None, max_length=255)


class ClassReviewDecisionItem(BaseModel):
    """Décision admin par mira_class proposée pendant la candidature."""

    class_id: str
    decision: Literal["validated_draft", "rejected"]
    rejection_reason: Optional[str] = Field(None, max_length=2000)


class MentorApplicationReviewDecision(BaseModel):
    """Body pour POST /v1/admin/mentors/applications/{id}/review — Décision admin."""

    decision: Literal["validated", "rejected", "in_review"]
    decision_reason: Optional[str] = Field(None, max_length=2000)
    class_decisions: list[ClassReviewDecisionItem] = Field(default_factory=list)


class MentorApplicationRead(BaseModel):
    """Réponse lecture — vue authentifiée complète de la candidature."""

    id: str
    user_id: str
    status: ApplicationStatus
    first_name: str
    last_name: str
    nomad_since_year: Optional[int]
    prior_masterclasses_count: int
    bio: str = ""
    professional_journey: list[ProfessionalExperience] = []
    transmission_pitch: str = ""
    motivation: str = ""
    linkedin_url: Optional[str] = None
    instagram_url: Optional[str] = None
    website_url: Optional[str] = None
    submitted_at: Optional[datetime]
    reviewed_at: Optional[datetime]
    reviewed_by_admin_id: Optional[str]
    decision_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
