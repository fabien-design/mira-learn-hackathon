"""Schemas Pydantic — MentorProfileSkill."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SkillLevel = Literal["intermediate", "advanced", "expert"]


class MentorProfileSkillBase(BaseModel):
    skill_id: str
    level: SkillLevel
    is_primary: bool = False
    display_order: int = Field(default=0, ge=0)


class MentorProfileSkillCreate(MentorProfileSkillBase):
    pass


class MentorProfileSkillUpdate(BaseModel):
    level: Optional[SkillLevel] = None
    is_primary: Optional[bool] = None
    display_order: Optional[int] = Field(None, ge=0)


class MentorProfileSkillRead(MentorProfileSkillBase):
    id: str
    profile_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
