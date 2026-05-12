"""Modèle SQLAlchemy — table skill (catalogue partagé, seed initial Groupe A)."""
from sqlalchemy import CheckConstraint, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IDMixin, SoftDeleteMixin, TimestampMixin


class Skill(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "skill"

    slug: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    popularity_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        CheckConstraint(
            "category IN ('business', 'design', 'tech', 'soft', 'lifestyle')",
            name="skill_category_check",
        ),
        Index("idx_skill_category_m", "category", postgresql_where="deleted_at IS NULL"),
        Index("idx_skill_popularity_m", "popularity_score", postgresql_where="deleted_at IS NULL"),
    )
