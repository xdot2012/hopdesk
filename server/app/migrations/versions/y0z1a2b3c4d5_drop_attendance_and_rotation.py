"""drop_attendance_and_rotation

Revision ID: y0z1a2b3c4d5
Revises: m9n0o1p2q3r4
Create Date: 2026-09-23 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "y0z1a2b3c4d5"
down_revision: Union[str, None] = "m9n0o1p2q3r4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS rotation_queue_member CASCADE")
    op.execute("DROP TABLE IF EXISTS rotation_queue CASCADE")
    op.execute("DROP TABLE IF EXISTS agent_absence CASCADE")
    op.execute("DROP TABLE IF EXISTS agent_break CASCADE")
    op.execute("DROP TABLE IF EXISTS attendance_holiday CASCADE")
    op.execute("DROP TABLE IF EXISTS attendance_week_interval CASCADE")


def downgrade() -> None:
    # Tables were productively removed; recreate via historical migrations if needed.
    pass
