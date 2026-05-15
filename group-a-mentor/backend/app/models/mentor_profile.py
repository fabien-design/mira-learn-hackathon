"""Modèle SQLAlchemy — table mentor_profile (fiche publique mentor validé)."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Index, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IDMixin, SoftDeleteMixin, TimestampMixin


class MentorProfile(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "mentor_profile"

    user_id: Mapped[str] = mapped_column(PGUUID(as_uuid=False), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)

    # Identité publique
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    headline: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    bio: Mapped[str] = mapped_column(Text, nullable=False, default="")
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Parcours
    professional_journey: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    # Liens sociaux
    linkedin_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    instagram_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Status
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")

    # Stats dénormalisées
    aggregate_rating: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), nullable=True)
    rating_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    classes_given_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Audit
    validated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'paused', 'archived')",
            name="mentor_profile_status_check",
        ),
        CheckConstraint(
            "aggregate_rating IS NULL OR aggregate_rating BETWEEN 0 AND 5",
            name="mentor_profile_rating_check",
        ),
        CheckConstraint("rating_count >= 0", name="mentor_profile_rating_count_check"),
        CheckConstraint("classes_given_count >= 0", name="mentor_profile_classes_count_check"),
        Index("idx_mp_status_m", "status", postgresql_where="deleted_at IS NULL"),
        Index("idx_mp_rating_m", "aggregate_rating", postgresql_where="deleted_at IS NULL"),
        Index("idx_mp_classes_m", "classes_given_count", postgresql_where="deleted_at IS NULL"),
    )
