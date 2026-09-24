"""sla_policy_timezone

Revision ID: a2b3c4d5e6f7
Revises: z1a2b3c4d5e6
Create Date: 2026-09-23 16:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, None] = "z1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_TIMEZONE = "America/Sao_Paulo"


def upgrade() -> None:
    op.add_column(
        "service_level_agreement_policy",
        sa.Column(
            "timezone",
            sa.String(length=64),
            nullable=False,
            server_default=DEFAULT_TIMEZONE,
        ),
    )
    op.execute(
        sa.text(
            """
            UPDATE service_level_agreement_policy
            SET timezone = COALESCE(
                (SELECT timezone FROM instance_settings LIMIT 1),
                :default_tz
            )
            """
        ).bindparams(default_tz=DEFAULT_TIMEZONE)
    )


def downgrade() -> None:
    op.drop_column("service_level_agreement_policy", "timezone")
