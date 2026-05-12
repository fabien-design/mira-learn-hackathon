from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IDMixin, SoftDeleteMixin, TimestampMixin


class MentorApplication(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    """Candidature mentor — state machine draft → submitted → in_review → validated | rejected."""

    __tablename__ = "mentor_application"

    user_id: Mapped[str] = mapped_column(PGUUID(as_uuid=False), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")

    # Étape 1 — Identité
    first_name: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    last_name: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    nomad_since_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    prior_masterclasses_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Étape 2-3 — Import CV (optionnel)
    cv_import_id: Mapped[Optional[str]] = mapped_column(PGUUID(as_uuid=False), nullable=True)

    # Étape 3.2 — Profil
    bio: Mapped[str] = mapped_column(Text, nullable=False, default="")
    professional_journey: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    transmission_pitch: Mapped[str] = mapped_column(Text, nullable=False, default="")
    motivation: Mapped[str] = mapped_column(Text, nullable=False, default="")

    linkedin_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    instagram_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    website_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Review admin
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by_admin_id: Mapped[Optional[str]] = mapped_column(PGUUID(as_uuid=False), nullable=True)
    decision_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
