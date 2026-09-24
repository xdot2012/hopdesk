"""remove_tickets_rotation_mode

Revision ID: q7f8a9b0c1d2
Revises: p6e7f8a9b0c1
Create Date: 2026-08-23 13:10:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "q7f8a9b0c1d2"
down_revision: Union[str, None] = "p6e7f8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE rotation_queue
            SET mode_type = 'days', mode_units = 7
            WHERE mode_type = 'tickets'
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


def downgrade() -> None:
    op.alter_column(
        "rotation_queue",
        "mode_type",
        server_default="tickets",
    )
    op.alter_column(
        "rotation_queue",
        "mode_units",
        server_default="1",
    )
