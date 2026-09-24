"""sector_color_manager_and_ticket_sector

Revision ID: j0e1f2a3b4c5
Revises: i9d0e1f2a3b4
Create Date: 2026-08-21 19:40:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "j0e1f2a3b4c5"
down_revision: Union[str, None] = "i9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SECTOR_PALETTE = (
    "#2563EB",
    "#059669",
    "#D97706",
    "#DC2626",
    "#7C3AED",
    "#0891B2",
    "#DB2777",
    "#65A30D",
)


def upgrade() -> None:
    op.add_column("sector", sa.Column("color", sa.String(length=7), nullable=True))
    op.add_column(
        "customer_member",
        sa.Column("is_sector_manager", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("ticket", sa.Column("sector_id", sa.Uuid(), nullable=True))
    op.create_index(op.f("ix_ticket_sector_id"), "ticket", ["sector_id"], unique=False)
    op.create_foreign_key(
        "fk_ticket_sector_id",
        "ticket",
        "sector",
        ["sector_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Assign default colors to existing sectors (per customer, round-robin).
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, customer_id
            FROM sector
            ORDER BY customer_id, lower(name)
            """
        )
    ).fetchall()
    counters: dict = {}
    for row in rows:
        sector_id, customer_id = row[0], row[1]
        key = str(customer_id)
        idx = counters.get(key, 0)
        color = SECTOR_PALETTE[idx % len(SECTOR_PALETTE)]
        counters[key] = idx + 1
        conn.execute(
            sa.text("UPDATE sector SET color = :color WHERE id = :id"),
            {"color": color, "id": sector_id},
        )

    op.alter_column("sector", "color", nullable=False)

    # Snapshot sector from requester membership onto existing tickets.
    op.execute(
        """
        UPDATE ticket t
        SET sector_id = cm.sector_id
        FROM customer_member cm
        WHERE cm.user_id = t.requester_user_id
          AND cm.customer_id = t.customer_id
          AND cm.sector_id IS NOT NULL
          AND t.sector_id IS NULL
        """
    )


def downgrade() -> None:
    op.drop_constraint("fk_ticket_sector_id", "ticket", type_="foreignkey")
    op.drop_index(op.f("ix_ticket_sector_id"), table_name="ticket")
    op.drop_column("ticket", "sector_id")
    op.drop_column("customer_member", "is_sector_manager")
    op.drop_column("sector", "color")
