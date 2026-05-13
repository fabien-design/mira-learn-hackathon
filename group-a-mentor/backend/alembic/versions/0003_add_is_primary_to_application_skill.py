"""0003 — add is_primary to mentor_application_skill

Revision ID: 0003a
Revises: 0002a
Create Date: 2026-05-13
"""
from alembic import op

revision = "0003a"
down_revision = "0002a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE mentor_application_skill "
        "ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE mentor_application_skill DROP COLUMN IF EXISTS is_primary"
    )
