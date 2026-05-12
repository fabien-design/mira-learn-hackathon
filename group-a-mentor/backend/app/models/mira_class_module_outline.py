"""Modèle SQLAlchemy — table mira_class_module_outline (programme grossier de la class)."""
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IDMixin, TimestampMixin


class MiraClassModuleOutline(Base, IDMixin, TimestampMixin):
    __tablename__ = "mira_class_module_outline"

    class_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("mira_class.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    estimated_duration_hours: Mapped[float] = mapped_column(Numeric(4, 1), nullable=False)

    __table_args__ = (
        CheckConstraint("estimated_duration_hours > 0", name="mira_class_module_outline_duration_check"),
        UniqueConstraint("class_id", "position", name="uq_mira_class_module_outline_position"),
        Index("idx_mcmo_class_id_m", "class_id", "position"),
    )
