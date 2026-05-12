"""Modèle SQLAlchemy — table mira_class_ai_suggestion (suggestions IA classes)."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IDMixin


class MiraClassAISuggestion(Base, IDMixin):
    __tablename__ = "mira_class_ai_suggestion"

    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("mentor_application.id", ondelete="CASCADE"), nullable=False
    )

    # Contenu suggéré
    suggested_title: Mapped[str] = mapped_column(String(200), nullable=False)
    suggested_description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    suggested_skill_ids: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    suggested_outline: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    suggested_total_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    suggested_format: Mapped[str] = mapped_column(String(16), nullable=False)

    # Argumentaire IA
    justification: Mapped[str] = mapped_column(Text, nullable=False)
    skill_demand_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    skill_offer_gap_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)

    # Lifecycle
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="proposed")
    adopted_into_class_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("mira_class.id", ondelete="SET NULL"), nullable=True
    )
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # IA tracking
    llm_model_used: Mapped[str] = mapped_column(String(64), nullable=False)
    llm_tokens_consumed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    generation_prompt_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint(
            "suggested_format IN ('physical', 'virtual', 'both')",
            name="mira_class_ai_suggestion_format_check",
        ),
        CheckConstraint(
            "status IN ('proposed', 'adopted', 'rejected', 'modified')",
            name="mira_class_ai_suggestion_status_check",
        ),
        CheckConstraint(
            "rejected_reason IS NULL OR rejected_reason IN ('not_my_expertise', 'not_interested', 'too_generic', 'duplicate', 'other')",
            name="mira_class_ai_suggestion_rejected_reason_check",
        ),
        Index("idx_mcais_application_id_m", "application_id", "generated_at"),
        Index("idx_mcais_status_m", "status"),
    )
