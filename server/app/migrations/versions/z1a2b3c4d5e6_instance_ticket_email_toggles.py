"""instance_ticket_email_toggles

Revision ID: z1a2b3c4d5e6
Revises: y0z1a2b3c4d5
Create Date: 2026-09-23 15:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "z1a2b3c4d5e6"
down_revision: Union[str, None] = "y0z1a2b3c4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "instance_settings",
        sa.Column(
            "ticket_email_on_created",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "instance_settings",
        sa.Column(
            "ticket_email_on_public_message",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "instance_settings",
        sa.Column(
            "ticket_email_on_status_change",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "instance_settings",
        sa.Column(
            "ticket_email_on_assignment",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("instance_settings", "ticket_email_on_assignment")
    op.drop_column("instance_settings", "ticket_email_on_status_change")
    op.drop_column("instance_settings", "ticket_email_on_public_message")
    op.drop_column("instance_settings", "ticket_email_on_created")
