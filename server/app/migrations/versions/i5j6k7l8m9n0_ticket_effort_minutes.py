"""ticket_effort_minutes

Revision ID: i5j6k7l8m9n0
Revises: h4c5d6e7f8a9
Create Date: 2026-09-15 14:15:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "i5j6k7l8m9n0"
down_revision: Union[str, None] = "h4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ticket",
        sa.Column("effort_minutes", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ticket", "effort_minutes")
