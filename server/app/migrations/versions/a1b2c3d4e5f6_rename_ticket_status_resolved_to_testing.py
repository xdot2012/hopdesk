"""rename_ticket_status_resolved_to_testing

Revision ID: a1b2c3d4e5f6
Revises: 3f83e61dc228
Create Date: 2026-08-21 02:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "3f83e61dc228"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE ticket SET status = 'testing' WHERE status = 'resolved'")


def downgrade() -> None:
    op.execute("UPDATE ticket SET status = 'resolved' WHERE status = 'testing'")
