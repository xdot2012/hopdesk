"""drop_rotation_member_schedule_color

Revision ID: g3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-09-14 18:15:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "g3b4c5d6e7f8"
down_revision: Union[str, None] = "f2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("rotation_queue_member", "schedule_color")


def downgrade() -> None:
    op.add_column(
        "rotation_queue_member",
        sa.Column("schedule_color", sa.String(length=7), nullable=True),
    )
