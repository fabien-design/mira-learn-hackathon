"""0004 — add extracted_profile_raw to mentor_cv_import

Revision ID: 0004a
Revises: 0003a
Create Date: 2026-05-13
"""
from alembic import op

revision = "0004a"
down_revision = "0003a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE mentor_cv_import "
        "ADD COLUMN IF NOT EXISTS extracted_profile_raw JSONB"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE mentor_cv_import DROP COLUMN IF EXISTS extracted_profile_raw"
    )
