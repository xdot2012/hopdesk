"""ticket_in_progress_and_awaiting_customer

Revision ID: x4y5z6a7b8c9
Revises: w3x4y5z6a7b8
Create Date: 2026-08-25 21:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "x4y5z6a7b8c9"
down_revision: Union[str, None] = "w3x4y5z6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ticket",
        sa.Column(
            "awaiting_customer_reply",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "ticket_message",
        sa.Column(
            "customer_pending",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.execute(
        """
        UPDATE ticket
        SET status = 'in_progress',
            awaiting_customer_reply = true
        WHERE status = 'waiting_customer'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE ticket
        SET status = 'waiting_customer'
        WHERE status = 'in_progress' AND awaiting_customer_reply = true
        """
    )
    op.drop_column("ticket_message", "customer_pending")
    op.drop_column("ticket", "awaiting_customer_reply")
