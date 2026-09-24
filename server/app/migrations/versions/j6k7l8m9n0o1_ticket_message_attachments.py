"""ticket_message_attachments

Revision ID: j6k7l8m9n0o1
Revises: i5j6k7l8m9n0
Create Date: 2026-09-16 20:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "j6k7l8m9n0o1"
down_revision: Union[str, None] = "i5j6k7l8m9n0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ticket_attachment",
        sa.Column("message_id", sa.Uuid(), nullable=True),
    )
    op.create_index(
        op.f("ix_ticket_attachment_message_id"),
        "ticket_attachment",
        ["message_id"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("fk_ticket_attachment_message_id_ticket_message"),
        "ticket_attachment",
        "ticket_message",
        ["message_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_ticket_attachment_message_id_ticket_message"),
        "ticket_attachment",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_ticket_attachment_message_id"), table_name="ticket_attachment")
    op.drop_column("ticket_attachment", "message_id")
