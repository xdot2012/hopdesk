"""ticket_satisfaction

Revision ID: k7l8m9n0o1p2
Revises: j6k7l8m9n0o1
Create Date: 2026-09-19 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "k7l8m9n0o1p2"
down_revision: Union[str, None] = "j6k7l8m9n0o1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ticket",
        sa.Column("satisfaction_rating", sa.Integer(), nullable=True),
    )
    op.add_column(
        "ticket",
        sa.Column("satisfaction_comment", sa.Text(), nullable=True),
    )
    op.add_column(
        "ticket",
        sa.Column("satisfaction_rated_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ticket", "satisfaction_rated_at")
    op.drop_column("ticket", "satisfaction_comment")
    op.drop_column("ticket", "satisfaction_rating")
