"""ticket_page_url_and_attachments

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-21 12:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ticket", sa.Column("page_url", sa.String(length=2000), nullable=True))
    op.execute("UPDATE ticket SET page_url = '' WHERE page_url IS NULL")
    op.alter_column("ticket", "page_url", existing_type=sa.String(length=2000), nullable=False)

    op.create_table(
        "ticket_attachment",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("ticket_id", sa.Uuid(), nullable=False),
        sa.Column("file_key", sa.String(length=500), nullable=False),
        sa.Column("original_filename", sa.String(length=500), nullable=False),
        sa.Column("content_type", sa.String(length=200), nullable=False),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["ticket_id"], ["ticket.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_ticket_attachment_id"),
        "ticket_attachment",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ticket_attachment_ticket_id"),
        "ticket_attachment",
        ["ticket_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_ticket_attachment_ticket_id"), table_name="ticket_attachment")
    op.drop_index(op.f("ix_ticket_attachment_id"), table_name="ticket_attachment")
    op.drop_table("ticket_attachment")
    op.drop_column("ticket", "page_url")
