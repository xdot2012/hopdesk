"""rotation_mode_fields

Revision ID: p6e7f8a9b0c1
Revises: o5d6e7f8a9b0
Create Date: 2026-08-23 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "p6e7f8a9b0c1"
down_revision: Union[str, None] = "o5d6e7f8a9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "rotation_queue",
        sa.Column(
            "mode_type",
            sa.String(length=20),
            nullable=False,
            server_default="tickets",
        ),
    )
    op.add_column(
        "rotation_queue",
        sa.Column(
            "mode_units",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )

    conn = op.get_bind()
    count = conn.execute(sa.text("SELECT COUNT(*) FROM rotation_queue")).scalar()
    if count == 0:
        conn.execute(
            sa.text(
                """
                INSERT INTO rotation_queue (
                    id, name, strategy, mode_type, mode_units, active, created_at, updated_at
                )
                VALUES (
                    gen_random_uuid(),
                    'default',
                    'round_robin',
                    'tickets',
                    1,
                    true,
                    NOW(),
                    NOW()
                )
                """
            )
        )


def downgrade() -> None:
    op.drop_column("rotation_queue", "mode_units")
    op.drop_column("rotation_queue", "mode_type")
