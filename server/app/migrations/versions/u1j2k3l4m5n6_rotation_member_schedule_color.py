"""rotation_member_schedule_color

Revision ID: u1j2k3l4m5n6
Revises: t0i1b2c3d4e5
Create Date: 2026-08-23 18:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "u1j2k3l4m5n6"
down_revision: Union[str, None] = "t0i1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MEMBER_COLOR_PALETTE = (
    "#E11D48",
    "#EA580C",
    "#CA8A04",
    "#16A34A",
    "#0891B2",
    "#2563EB",
    "#7C3AED",
    "#DB2777",
    "#DC2626",
    "#65A30D",
    "#4F46E5",
    "#D97706",
)


def upgrade() -> None:
    op.add_column(
        "rotation_queue_member",
        sa.Column("schedule_color", sa.String(length=7), nullable=True),
    )

    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id
            FROM rotation_queue_member
            ORDER BY queue_id ASC, position ASC, id ASC
            """
        )
    ).fetchall()
    for index, row in enumerate(rows):
        color = MEMBER_COLOR_PALETTE[index % len(MEMBER_COLOR_PALETTE)]
        conn.execute(
            sa.text(
                "UPDATE rotation_queue_member SET schedule_color = :color WHERE id = :id"
            ),
            {"color": color, "id": row[0]},
        )


def downgrade() -> None:
    op.drop_column("rotation_queue_member", "schedule_color")
