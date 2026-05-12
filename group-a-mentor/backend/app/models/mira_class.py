"""Modèle SQLAlchemy — table mira_class (proposition de class pendant candidature)."""
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IDMixin, SoftDeleteMixin, TimestampMixin


class MiraClass(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "mira_class"

    # Liens
    application_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("mentor_application.id", ondelete="SET NULL"), nullable=True
    )
    mentor_user_id: Mapped[str] = mapped_column(String(36), nullable=False)

    # Identité
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    skills_taught: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    # Charge horaire
    total_hours_collective: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_hours_individual: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Format + rythme + villes
    format_envisaged: Mapped[str] = mapped_column(String(16), nullable=False, default="both")
    rythm_pattern: Mapped[str | None] = mapped_column(String(32), nullable=True)
    target_cities: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    # Pricing
    recommended_price_per_hour_collective_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    recommended_price_per_hour_individual_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    # State machine
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # IA tracking
    ai_assisted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    source_suggestion_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    # Audit transitions
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'submitted', 'in_review', 'validated_draft', 'enrichment_in_progress', 'published', 'rejected', 'archived')",
            name="mira_class_status_check",
        ),
        CheckConstraint(
            "format_envisaged IN ('physical', 'virtual', 'both')",
            name="mira_class_format_check",
        ),
        CheckConstraint(
            "rythm_pattern IS NULL OR rythm_pattern IN ('weekly_session', 'biweekly_session', 'monthly_workshop', 'intensive_weekend', 'self_paced')",
            name="mira_class_rythm_check",
        ),
        CheckConstraint("total_hours_collective >= 0", name="mira_class_hours_collective_check"),
        CheckConstraint("total_hours_individual >= 0", name="mira_class_hours_individual_check"),
        CheckConstraint("total_hours >= 0", name="mira_class_hours_check"),
        CheckConstraint("recommended_price_per_hour_collective_cents >= 0", name="mira_class_price_collective_check"),
        CheckConstraint("recommended_price_per_hour_individual_cents >= 0", name="mira_class_price_individual_check"),
        Index("idx_mc_mentor_user_id_m", "mentor_user_id", postgresql_where="deleted_at IS NULL"),
        Index("idx_mc_status_m", "status", postgresql_where="deleted_at IS NULL"),
        Index("idx_mc_application_id_m", "application_id", postgresql_where="deleted_at IS NULL"),
        Index("idx_mc_published_m", "status", "published_at", postgresql_where="status = 'published' AND deleted_at IS NULL"),
    )
