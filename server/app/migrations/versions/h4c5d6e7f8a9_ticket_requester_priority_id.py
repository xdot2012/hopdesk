"""ticket_requester_priority_id

Revision ID: h4c5d6e7f8a9
Revises: g3b4c5d6e7f8
Create Date: 2026-09-14 19:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "h4c5d6e7f8a9"
down_revision: Union[str, None] = "g3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ticket",
        sa.Column("requester_priority_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        op.f("ix_ticket_requester_priority_id"),
        "ticket",
        ["requester_priority_id"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("fk_ticket_requester_priority_id_ticket_priority"),
        "ticket",
        "ticket_priority",
        ["requester_priority_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_ticket_requester_priority_id_ticket_priority"),
        "ticket",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_ticket_requester_priority_id"), table_name="ticket")
    op.drop_column("ticket", "requester_priority_id")
