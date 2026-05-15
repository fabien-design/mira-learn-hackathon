"""Modèle SQLAlchemy — table mentor_application_skill (skills du candidat)."""
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IDMixin


class MentorApplicationSkill(Base, IDMixin):
    __tablename__ = "mentor_application_skill"

    application_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("mentor_application.id", ondelete="CASCADE"),
        nullable=False,
    )
    skill_id: Mapped[str] = mapped_column(PGUUID(as_uuid=False), nullable=False)
    level: Mapped[str] = mapped_column(String(32), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    self_declared: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    validated_via_cv_import: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint(
            "level IN ('intermediate', 'advanced', 'expert')",
            name="mentor_application_skill_level_check",
        ),
        UniqueConstraint("application_id", "skill_id", name="uq_mentor_application_skill"),
        Index("idx_mas_application_id_m", "application_id"),
        Index("idx_mas_skill_id_m", "skill_id"),
    )
