"""0005 — sanitize skill slugs (replace non-[a-z0-9-] chars with hyphens)

Revision ID: 0005a
Revises: 0004a
Create Date: 2026-05-13

WHY: LLM-created skills (e.g. "node.js") contain dots/special chars that
violate the SkillRead slug pattern ^[a-z0-9-]+$ and crash GET /v1/skills.
"""
from alembic import op

revision = "0005a"
down_revision = "0004a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE skill "
        "SET slug = regexp_replace(slug, '[^a-z0-9-]', '-', 'g') "
        "WHERE slug ~ '[^a-z0-9-]'"
    )


def downgrade() -> None:
    pass  # data migration — not reversible without a snapshot
