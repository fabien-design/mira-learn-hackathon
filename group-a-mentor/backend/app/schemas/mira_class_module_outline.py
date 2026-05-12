"""Schemas Pydantic — MiraClassModuleOutline (programme grossier de la class)."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class MiraClassModuleOutlineBase(BaseModel):
    position: int = Field(..., ge=1)
    title: str = Field(..., max_length=200)
    estimated_duration_hours: Decimal = Field(..., gt=0)


class MiraClassModuleOutlineCreate(MiraClassModuleOutlineBase):
    pass


class MiraClassModuleOutlineUpdate(BaseModel):
    position: Optional[int] = Field(None, ge=1)
    title: Optional[str] = Field(None, max_length=200)
    estimated_duration_hours: Optional[Decimal] = Field(None, gt=0)


class MiraClassModuleOutlineRead(MiraClassModuleOutlineBase):
    id: str
    class_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
