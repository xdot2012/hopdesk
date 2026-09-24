"""ticket_external_id_optional_page_url

Revision ID: e1f2a3b4c5d6
Revises: d0e1f2a3b4c5
Create Date: 2026-09-14 17:50:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "d0e1f2a3b4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ticket", sa.Column("external_id", sa.String(length=200), nullable=True))
    op.alter_column(
        "ticket",
        "page_url",
        existing_type=sa.String(length=2000),
        nullable=True,
        server_default="",
    )
    op.execute("UPDATE ticket SET page_url = '' WHERE page_url IS NULL")


def downgrade() -> None:
    op.execute("UPDATE ticket SET page_url = '' WHERE page_url IS NULL")
    op.alter_column(
        "ticket",
        "page_url",
        existing_type=sa.String(length=2000),
        nullable=False,
        server_default=None,
    )
    op.drop_column("ticket", "external_id")
