"""Schemas Pydantic — MentorApplicationSkill."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

SkillLevel = Literal["intermediate", "advanced", "expert"]


class MentorApplicationSkillBase(BaseModel):
    skill_id: str
    level: SkillLevel
    self_declared: bool = True
    validated_via_cv_import: bool = False


class MentorApplicationSkillCreate(MentorApplicationSkillBase):
    pass


class MentorApplicationSkillRead(MentorApplicationSkillBase):
    id: str
    application_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
