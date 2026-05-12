"""Schemas Pydantic — MentorCVImport."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

CVSourceType = Literal["pdf", "linkedin_url", "manual_paste"]
CVImportStatus = Literal["uploaded", "extracting", "extracted", "validated", "failed"]


class ExtractedExperience(BaseModel):
    role: str
    company: str
    start_year: int
    end_year: Optional[int] = None
    description: str = ""


class ExtractedSkill(BaseModel):
    skill_slug: str
    level: Literal["intermediate", "advanced", "expert"]
    confidence: float = Field(..., ge=0.0, le=1.0)
    evidence: str = ""


class MentorCVImportCreate(BaseModel):
    source_type: CVSourceType
    file_url: Optional[str] = Field(None, max_length=500)
    source_url: Optional[str] = Field(None, max_length=500)
    raw_text: Optional[str] = None


class MentorCVImportValidate(BaseModel):
    """Candidat valide les résultats de l'extraction IA."""
    validated_experiences: list[ExtractedExperience]
    validated_skills: list[ExtractedSkill]


class MentorCVImportRead(BaseModel):
    id: str
    application_id: str
    source_type: CVSourceType
    file_url: Optional[str]
    source_url: Optional[str]
    status: CVImportStatus
    error_message: Optional[str]
    extracted_experiences_raw: Optional[list[ExtractedExperience]]
    extracted_skills_raw: Optional[list[ExtractedSkill]]
    validated_experiences: Optional[list[ExtractedExperience]]
    validated_skills: Optional[list[ExtractedSkill]]
    extracted_at: Optional[datetime]
    validated_at: Optional[datetime]
    llm_model_used: Optional[str]
    llm_tokens_consumed: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
