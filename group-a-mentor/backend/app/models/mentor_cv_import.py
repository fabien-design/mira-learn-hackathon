"""Modèle SQLAlchemy — table mentor_cv_import (import CV/LinkedIn + parsing IA)."""
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IDMixin, SoftDeleteMixin, TimestampMixin


class MentorCVImport(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "mentor_cv_import"

    application_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("mentor_application.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Source
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Lifecycle
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="uploaded")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Résultats IA
    extracted_experiences_raw: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    extracted_skills_raw: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    extracted_profile_raw: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Données validées par le candidat
    validated_experiences: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    validated_skills: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Audit IA
    extracted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    llm_model_used: Mapped[str | None] = mapped_column(String(64), nullable=True)
    llm_tokens_consumed: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "source_type IN ('pdf', 'linkedin_url', 'manual_paste')",
            name="mentor_cv_import_source_type_check",
        ),
        CheckConstraint(
            "status IN ('uploaded', 'extracting', 'extracted', 'validated', 'failed')",
            name="mentor_cv_import_status_check",
        ),
        Index("idx_mcv_application_id_m", "application_id"),
        Index("idx_mcv_status_m", "status", postgresql_where="deleted_at IS NULL"),
    )
