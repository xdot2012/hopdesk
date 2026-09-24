"""ticket_view for per-user last seen

Revision ID: k1f2a3b4c5d6
Revises: j0e1f2a3b4c5
Create Date: 2026-08-22 14:40:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "k1f2a3b4c5d6"
down_revision: Union[str, None] = "j0e1f2a3b4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ticket_view",
        sa.Column("ticket_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "last_viewed_at",
            sa.DateTime(timezone=False),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["ticket_id"], ["ticket.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("ticket_id", "user_id"),
    )
    op.create_index(op.f("ix_ticket_view_ticket_id"), "ticket_view", ["ticket_id"], unique=False)
    op.create_index(op.f("ix_ticket_view_user_id"), "ticket_view", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_ticket_view_user_id"), table_name="ticket_view")
    op.drop_index(op.f("ix_ticket_view_ticket_id"), table_name="ticket_view")
    op.drop_table("ticket_view")
