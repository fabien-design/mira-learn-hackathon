"""Schemas Pydantic — MentorProfile."""
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

MentorProfileStatus = Literal["active", "paused", "archived"]


class ProfessionalExperience(BaseModel):
    role: str = Field(..., max_length=120)
    company: str = Field(..., max_length=120)
    start_year: int = Field(..., ge=1970, le=2030)
    end_year: Optional[int] = Field(None, ge=1970, le=2030)
    description: str = Field(default="", max_length=2000)


class MentorProfileBase(BaseModel):
    display_name: str = Field(..., max_length=120)
    headline: str = Field(default="", max_length=255)
    bio: str = Field(default="", max_length=10000)
    avatar_url: Optional[str] = Field(None, max_length=500)
    cover_url: Optional[str] = Field(None, max_length=500)
    professional_journey: list[ProfessionalExperience] = []
    linkedin_url: Optional[str] = Field(None, max_length=255)
    instagram_url: Optional[str] = Field(None, max_length=255)
    website_url: Optional[str] = Field(None, max_length=255)


class MentorProfileCreate(MentorProfileBase):
    """Création via validation candidature (interne)."""
    user_id: str
    slug: str = Field(..., max_length=120, pattern=r"^[a-z0-9-]+$")


class MentorProfileUpdate(BaseModel):
    """Édition par le mentor depuis son dashboard."""
    display_name: Optional[str] = Field(None, max_length=120)
    headline: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = Field(None, max_length=10000)
    avatar_url: Optional[str] = Field(None, max_length=500)
    cover_url: Optional[str] = Field(None, max_length=500)
    professional_journey: Optional[list[ProfessionalExperience]] = None
    linkedin_url: Optional[str] = Field(None, max_length=255)
    instagram_url: Optional[str] = Field(None, max_length=255)
    website_url: Optional[str] = Field(None, max_length=255)
    status: Optional[MentorProfileStatus] = None


class MentorProfileRead(MentorProfileBase):
    id: str
    user_id: str
    slug: str
    status: MentorProfileStatus
    aggregate_rating: Optional[Decimal]
    rating_count: int
    classes_given_count: int
    validated_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MentorProfilePublic(BaseModel):
    """Vue publique (catalogue + fiche /mentors/{slug})."""
    id: str
    slug: str
    display_name: str
    headline: str
    bio: str
    avatar_url: Optional[str]
    cover_url: Optional[str]
    professional_journey: list[ProfessionalExperience]
    linkedin_url: Optional[str]
    instagram_url: Optional[str]
    website_url: Optional[str]
    aggregate_rating: Optional[Decimal]
    rating_count: int
    classes_given_count: int

    model_config = ConfigDict(from_attributes=True)


class MentorProfileSkillPublic(BaseModel):
    """Skill d'une fiche mentor publique."""
    skill_id: str
    skill_name: str
    skill_slug: str
    level: str
    is_primary: bool
    display_order: int
    category: str
