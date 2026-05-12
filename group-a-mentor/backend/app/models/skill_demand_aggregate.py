"""Modèle SQLAlchemy — table skill_demand_aggregate (vue agrégée demande × offre)."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Index, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class SkillDemandAggregate(Base, TimestampMixin):
    """PK = skill_id. Lecture seule en hackathon (seedée, pas d'endpoint write)."""
    __tablename__ = "skill_demand_aggregate"

    skill_id: Mapped[str] = mapped_column(String(36), primary_key=True)

    students_wanting_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mentors_offering_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    active_classes_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    gap_score: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=0)

    period_label: Mapped[str] = mapped_column(String(32), nullable=False, default="current_snapshot")

    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint("students_wanting_count >= 0", name="sda_students_check"),
        CheckConstraint("mentors_offering_count >= 0", name="sda_mentors_check"),
        Index("idx_sda_gap_m", "gap_score"),
        Index("idx_sda_demand_m", "students_wanting_count"),
    )
