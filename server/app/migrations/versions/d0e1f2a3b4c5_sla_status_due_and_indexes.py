"""sla status due and overdue indexes

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-08-28 18:10:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "d0e1f2a3b4c5"
down_revision: Union[str, None] = "c9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE ticket
        SET service_level_agreement_status = 'due'
        WHERE service_level_agreement_status IN ('first_response_due', 'resolution_due')
        """
    )
    op.execute(
        """
        CREATE INDEX ix_ticket_sla_response_overdue
        ON ticket (response_due_at)
        WHERE service_level_agreement_status = 'due'
          AND first_responded_at IS NULL
          AND resolved_at IS NULL
        """
    )
    op.execute(
        """
        CREATE INDEX ix_ticket_sla_resolution_overdue
        ON ticket (resolution_due_at)
        WHERE service_level_agreement_status = 'due'
          AND first_responded_at IS NOT NULL
          AND resolved_at IS NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_ticket_sla_resolution_overdue")
    op.execute("DROP INDEX IF EXISTS ix_ticket_sla_response_overdue")
    op.execute(
        """
        UPDATE ticket
        SET service_level_agreement_status = CASE
            WHEN first_responded_at IS NULL THEN 'first_response_due'
            ELSE 'resolution_due'
        END
        WHERE service_level_agreement_status = 'due'
        """
    )
