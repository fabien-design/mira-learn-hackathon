"""Schemas Pydantic — Skill."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SkillCategory = Literal["business", "design", "tech", "soft", "lifestyle"]


class SkillBase(BaseModel):
    slug: str = Field(..., max_length=64, pattern=r"^[a-z0-9-]+$")
    name: str = Field(..., max_length=120)
    description: str = Field(default="", max_length=2000)
    category: SkillCategory
    popularity_score: int = Field(default=0, ge=0)


class SkillRead(SkillBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
