"""rotation_mode_weeks

Revision ID: v2w3x4y5z6a7
Revises: u1j2k3l4m5n6
Create Date: 2026-08-23 18:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "v2w3x4y5z6a7"
down_revision: Union[str, None] = "u1j2k3l4m5n6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE rotation_queue
            SET mode_type = 'weeks', mode_units = 1
            WHERE mode_type = 'days' AND mode_units = 7
            """
        )
    )
    op.alter_column(
        "rotation_queue",
        "mode_type",
        server_default="weeks",
    )
    op.alter_column(
        "rotation_queue",
        "mode_units",
        server_default="1",
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE rotation_queue
            SET mode_type = 'days', mode_units = 7
            WHERE mode_type = 'weeks' AND mode_units = 1
            """
        )
    )
    op.alter_column(
        "rotation_queue",
        "mode_type",
        server_default="days",
    )
    op.alter_column(
        "rotation_queue",
        "mode_units",
        server_default="7",
    )
