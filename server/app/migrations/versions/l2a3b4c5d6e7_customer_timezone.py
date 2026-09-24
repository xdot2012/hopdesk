"""customer_timezone

Revision ID: l2a3b4c5d6e7
Revises: k1f2a3b4c5d6
Create Date: 2026-08-22 17:15:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "l2a3b4c5d6e7"
down_revision: Union[str, None] = "k1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_TIMEZONE = "America/Sao_Paulo"


def upgrade() -> None:
    op.add_column(
        "customer",
        sa.Column("timezone", sa.String(length=64), nullable=True),
    )

    op.execute(
        f"""
        UPDATE customer c
        SET timezone = COALESCE(
            (
                SELECT p.timezone
                FROM attendance_policy p
                WHERE p.customer_id = c.id
                ORDER BY p.created_at ASC
                LIMIT 1
            ),
            '{DEFAULT_TIMEZONE}'
        )
        """
    )

    op.alter_column(
        "customer",
        "timezone",
        existing_type=sa.String(length=64),
        nullable=False,
        server_default=DEFAULT_TIMEZONE,
    )

    op.drop_column("attendance_policy", "timezone")


def downgrade() -> None:
    op.add_column(
        "attendance_policy",
        sa.Column("timezone", sa.String(length=64), nullable=True),
    )

    op.execute(
        f"""
        UPDATE attendance_policy p
        SET timezone = COALESCE(
            (SELECT c.timezone FROM customer c WHERE c.id = p.customer_id),
            '{DEFAULT_TIMEZONE}'
        )
        """
    )

    op.alter_column(
        "attendance_policy",
        "timezone",
        existing_type=sa.String(length=64),
        nullable=False,
        server_default=DEFAULT_TIMEZONE,
    )

    op.drop_column("customer", "timezone")
