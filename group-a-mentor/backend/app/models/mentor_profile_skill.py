"""Modèle SQLAlchemy — table mentor_profile_skill (skills affichées sur la fiche)."""
from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IDMixin, TimestampMixin


class MentorProfileSkill(Base, IDMixin, TimestampMixin):
    __tablename__ = "mentor_profile_skill"

    profile_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("mentor_profile.id", ondelete="CASCADE"),
        nullable=False,
    )
    skill_id: Mapped[str] = mapped_column(PGUUID(as_uuid=False), nullable=False)
    level: Mapped[str] = mapped_column(String(32), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        CheckConstraint(
            "level IN ('intermediate', 'advanced', 'expert')",
            name="mentor_profile_skill_level_check",
        ),
        UniqueConstraint("profile_id", "skill_id", name="uq_mentor_profile_skill"),
        Index("idx_mps_profile_id_m", "profile_id", "is_primary", "display_order"),
        Index("idx_mps_skill_id_m", "skill_id"),
        Index("idx_mps_primary_m", "skill_id", "profile_id", postgresql_where="is_primary = TRUE"),
    )
