"""rename service_level_agreement tables/columns to sla

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-09-23 17:50:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, None] = "a2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Partial indexes reference the old status column name in the predicate.
    op.execute("DROP INDEX IF EXISTS ix_ticket_sla_response_overdue")
    op.execute("DROP INDEX IF EXISTS ix_ticket_sla_resolution_overdue")

    op.execute(
        "ALTER TABLE ticket "
        "RENAME CONSTRAINT ticket_service_level_agreement_policy_id_fkey "
        "TO ticket_sla_policy_id_fkey"
    )
    op.execute(
        "ALTER TABLE ticket "
        "RENAME COLUMN service_level_agreement_policy_id TO sla_policy_id"
    )
    op.execute(
        "ALTER TABLE ticket "
        "RENAME COLUMN service_level_agreement_status TO sla_status"
    )
    op.execute(
        "ALTER INDEX ix_ticket_service_level_agreement_policy_id "
        "RENAME TO ix_ticket_sla_policy_id"
    )

    op.rename_table(
        "service_level_agreement_priority_target",
        "sla_priority_target",
    )
    op.execute(
        "ALTER TABLE sla_priority_target "
        "RENAME CONSTRAINT service_level_agreement_priority_target_pkey "
        "TO sla_priority_target_pkey"
    )
    op.execute(
        "ALTER TABLE sla_priority_target "
        "RENAME CONSTRAINT service_level_agreement_priority_target_policy_id_fkey "
        "TO sla_priority_target_policy_id_fkey"
    )
    op.execute(
        "ALTER TABLE sla_priority_target "
        "RENAME CONSTRAINT service_level_agreement_priority_target_priority_id_fkey "
        "TO sla_priority_target_priority_id_fkey"
    )
    op.execute(
        "ALTER INDEX ix_service_level_agreement_priority_target_id "
        "RENAME TO ix_sla_priority_target_id"
    )
    op.execute(
        "ALTER INDEX ix_service_level_agreement_priority_target_policy_id "
        "RENAME TO ix_sla_priority_target_policy_id"
    )
    op.execute(
        "ALTER INDEX ix_service_level_agreement_priority_target_priority_id "
        "RENAME TO ix_sla_priority_target_priority_id"
    )

    op.rename_table("service_level_agreement_policy", "sla_policy")
    op.execute(
        "ALTER TABLE sla_policy "
        "RENAME CONSTRAINT service_level_agreement_policy_pkey "
        "TO sla_policy_pkey"
    )
    op.execute(
        "ALTER INDEX ix_service_level_agreement_policy_id "
        "RENAME TO ix_sla_policy_id"
    )

    op.execute(
        """
        CREATE INDEX ix_ticket_sla_response_overdue
        ON ticket (response_due_at)
        WHERE sla_status = 'due'
          AND first_responded_at IS NULL
          AND resolved_at IS NULL
        """
    )
    op.execute(
        """
        CREATE INDEX ix_ticket_sla_resolution_overdue
        ON ticket (resolution_due_at)
        WHERE sla_status = 'due'
          AND first_responded_at IS NOT NULL
          AND resolved_at IS NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_ticket_sla_resolution_overdue")
    op.execute("DROP INDEX IF EXISTS ix_ticket_sla_response_overdue")

    op.execute("ALTER INDEX ix_sla_policy_id RENAME TO ix_service_level_agreement_policy_id")
    op.execute(
        "ALTER TABLE sla_policy "
        "RENAME CONSTRAINT sla_policy_pkey "
        "TO service_level_agreement_policy_pkey"
    )
    op.rename_table("sla_policy", "service_level_agreement_policy")

    op.execute(
        "ALTER INDEX ix_sla_priority_target_priority_id "
        "RENAME TO ix_service_level_agreement_priority_target_priority_id"
    )
    op.execute(
        "ALTER INDEX ix_sla_priority_target_policy_id "
        "RENAME TO ix_service_level_agreement_priority_target_policy_id"
    )
    op.execute(
        "ALTER INDEX ix_sla_priority_target_id "
        "RENAME TO ix_service_level_agreement_priority_target_id"
    )
    op.execute(
        "ALTER TABLE sla_priority_target "
        "RENAME CONSTRAINT sla_priority_target_priority_id_fkey "
        "TO service_level_agreement_priority_target_priority_id_fkey"
    )
    op.execute(
        "ALTER TABLE sla_priority_target "
        "RENAME CONSTRAINT sla_priority_target_policy_id_fkey "
        "TO service_level_agreement_priority_target_policy_id_fkey"
    )
    op.execute(
        "ALTER TABLE sla_priority_target "
        "RENAME CONSTRAINT sla_priority_target_pkey "
        "TO service_level_agreement_priority_target_pkey"
    )
    op.rename_table(
        "sla_priority_target",
        "service_level_agreement_priority_target",
    )

    op.execute(
        "ALTER INDEX ix_ticket_sla_policy_id "
        "RENAME TO ix_ticket_service_level_agreement_policy_id"
    )
    op.execute(
        "ALTER TABLE ticket "
        "RENAME COLUMN sla_status TO service_level_agreement_status"
    )
    op.execute(
        "ALTER TABLE ticket "
        "RENAME COLUMN sla_policy_id TO service_level_agreement_policy_id"
    )
    op.execute(
        "ALTER TABLE ticket "
        "RENAME CONSTRAINT ticket_sla_policy_id_fkey "
        "TO ticket_service_level_agreement_policy_id_fkey"
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
