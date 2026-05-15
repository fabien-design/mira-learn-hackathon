"""Modèle SQLAlchemy — table mentor_rating_breakdown (détail rating par sous-axe)."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class MentorRatingBreakdown(Base, TimestampMixin):
    """PK = profile_id (1:1 avec mentor_profile)."""
    __tablename__ = "mentor_rating_breakdown"

    profile_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("mentor_profile.id", ondelete="CASCADE"),
        primary_key=True,
    )

    axis_pedagogy: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), nullable=True)
    axis_presence: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), nullable=True)
    axis_deliverable: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), nullable=True)
    axis_community: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), nullable=True)
    trend_3m_vs_6m_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)

    rating_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_review_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint("axis_pedagogy IS NULL OR axis_pedagogy BETWEEN 0 AND 5", name="mrb_pedagogy_check"),
        CheckConstraint("axis_presence IS NULL OR axis_presence BETWEEN 0 AND 5", name="mrb_presence_check"),
        CheckConstraint("axis_deliverable IS NULL OR axis_deliverable BETWEEN 0 AND 5", name="mrb_deliverable_check"),
        CheckConstraint("axis_community IS NULL OR axis_community BETWEEN 0 AND 5", name="mrb_community_check"),
    )
