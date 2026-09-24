"""ticket_cause_and_solution

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-09-14 18:10:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ticket", sa.Column("cause", sa.Text(), nullable=True))
    op.add_column("ticket", sa.Column("solution", sa.Text(), nullable=True))
    op.add_column(
        "ticket",
        sa.Column("solution_internal", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("ticket", "solution_internal")
    op.drop_column("ticket", "solution")
    op.drop_column("ticket", "cause")
