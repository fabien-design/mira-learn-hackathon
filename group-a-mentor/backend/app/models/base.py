"""
Base SQLAlchemy declarative + mixins audit.

MIGRATION HINT (post-hackathon, CRITIQUE) :
    Le pattern Base + TimestampMixin + SoftDeleteMixin est entièrement remplacé
    par `UnifiedModel` de `ms-common-api` qui fournit nativement :

        from ms_common_api.models import UnifiedModel

        class MiraClass(UnifiedModel):
            __tablename__ = "mira_class"
            title: str  # type hints Python suffisent
            ...

    UnifiedModel apporte automatiquement :
        - id (UUID v4 auto-généré côté DB via uuid_generate_v4())
        - _id (alias Mongo-compat pour cross-store sync éventuel)
        - created_at, updated_at (auto, triggers DB)
        - deleted_at (soft delete)
        - JSend serialization : `model.to_jsend()`
        - NATS event emission hooks : `model.emit_created()`, `model.emit_updated()`, `model.emit_deleted()`
        - Validation pydantic intégrée au modèle

    Les migrations Alembic produites par ce template sont **directement compatibles**
    avec UnifiedModel : mêmes colonnes (id, created_at, updated_at, deleted_at), mêmes types.

    Transformation à appliquer :
        - `class X(Base, TimestampMixin, SoftDeleteMixin):` → `class X(UnifiedModel):`
        - Retirer les colonnes id/created_at/updated_at/deleted_at (auto)
        - Conserver les autres colonnes inchangées
        - Type hints SQLAlchemy `Mapped[type]` peuvent être simplifiés en `type` Python

    Voir `MIGRATION_GUIDE.md` section "Base SQLAlchemy → UnifiedModel".
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _generate_uuid() -> str:
    """Génère un UUID v4 en string (format Hello Mira)."""
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    """Base déclarative SQLAlchemy 2.0."""


class IDMixin:
    """Mixin : colonne id UUID v4 PK."""

    id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        primary_key=True,
        default=_generate_uuid,
    )


class TimestampMixin:
    """Mixin : created_at + updated_at."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class SoftDeleteMixin:
    """Mixin : deleted_at nullable (soft delete pattern Hello Mira)."""

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )


# Convention : tout modèle métier hérite des 3 mixins (sauf cas particuliers).
# Exemple : class MiraClass(Base, IDMixin, TimestampMixin, SoftDeleteMixin):
