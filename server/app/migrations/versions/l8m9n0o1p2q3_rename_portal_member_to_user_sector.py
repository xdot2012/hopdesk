"""rename_portal_member_to_user_sector

Revision ID: l8m9n0o1p2q3
Revises: k7l8m9n0o1p2
Create Date: 2026-09-23 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "l8m9n0o1p2q3"
down_revision: Union[str, None] = "k7l8m9n0o1p2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.rename_table("portal_member", "user_sector")
    op.execute(
        "ALTER TABLE user_sector "
        "RENAME CONSTRAINT portal_member_pkey TO user_sector_pkey"
    )
    op.execute(
        "ALTER TABLE user_sector "
        "RENAME CONSTRAINT uq_portal_member_user_id TO uq_user_sector_user_id"
    )
    op.execute(
        "ALTER TABLE user_sector "
        "RENAME CONSTRAINT fk_portal_member_user_id TO fk_user_sector_user_id"
    )
    op.execute(
        "ALTER TABLE user_sector "
        "RENAME CONSTRAINT fk_portal_member_sector_id TO fk_user_sector_sector_id"
    )
    op.execute("ALTER INDEX ix_portal_member_id RENAME TO ix_user_sector_id")
    op.execute("ALTER INDEX ix_portal_member_user_id RENAME TO ix_user_sector_user_id")
    op.execute("ALTER INDEX ix_portal_member_sector_id RENAME TO ix_user_sector_sector_id")


def downgrade() -> None:
    op.execute("ALTER INDEX ix_user_sector_sector_id RENAME TO ix_portal_member_sector_id")
    op.execute("ALTER INDEX ix_user_sector_user_id RENAME TO ix_portal_member_user_id")
    op.execute("ALTER INDEX ix_user_sector_id RENAME TO ix_portal_member_id")
    op.execute(
        "ALTER TABLE user_sector "
        "RENAME CONSTRAINT fk_user_sector_sector_id TO fk_portal_member_sector_id"
    )
    op.execute(
        "ALTER TABLE user_sector "
        "RENAME CONSTRAINT fk_user_sector_user_id TO fk_portal_member_user_id"
    )
    op.execute(
        "ALTER TABLE user_sector "
        "RENAME CONSTRAINT uq_user_sector_user_id TO uq_portal_member_user_id"
    )
    op.execute(
        "ALTER TABLE user_sector "
        "RENAME CONSTRAINT user_sector_pkey TO portal_member_pkey"
    )
    op.rename_table("user_sector", "portal_member")
