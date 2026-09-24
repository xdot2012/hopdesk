"""sla_per_customer_and_agent_scope

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-21 13:15:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "service_level_agreement_policy",
        sa.Column("customer_id", sa.Uuid(), nullable=True),
    )
    op.create_index(
        op.f("ix_service_level_agreement_policy_customer_id"),
        "service_level_agreement_policy",
        ["customer_id"],
        unique=False,
    )

    # Link existing default policy to HopDesk customer (create HopDesk if missing).
    op.execute(
        """
        INSERT INTO customer (id, created_at, updated_at, name)
        SELECT gen_random_uuid(), now(), now(), 'HopDesk'
        WHERE NOT EXISTS (
            SELECT 1 FROM customer WHERE lower(name) = lower('HopDesk')
        )
        """
    )
    op.execute(
        """
        UPDATE service_level_agreement_policy
        SET customer_id = (SELECT id FROM customer WHERE lower(name) = lower('HopDesk') LIMIT 1)
        WHERE customer_id IS NULL
          AND is_default IS TRUE
        """
    )
    # Any remaining policies without customer: also attach to HopDesk (legacy rows).
    op.execute(
        """
        UPDATE service_level_agreement_policy
        SET customer_id = (SELECT id FROM customer WHERE lower(name) = lower('HopDesk') LIMIT 1)
        WHERE customer_id IS NULL
        """
    )

    # Ensure every customer has a policy (copy targets from HopDesk/default when possible).
    op.execute(
        """
        INSERT INTO service_level_agreement_policy (id, created_at, updated_at, customer_id, name, is_default, enabled)
        SELECT gen_random_uuid(), now(), now(), c.id, 'Padrão', FALSE, TRUE
        FROM customer c
        WHERE NOT EXISTS (
            SELECT 1 FROM service_level_agreement_policy p WHERE p.customer_id = c.id
        )
        """
    )
    op.execute(
        """
        INSERT INTO service_level_agreement_priority_target (
            id, created_at, updated_at, policy_id, priority_id,
            first_response_minutes, resolution_minutes
        )
        SELECT
            gen_random_uuid(),
            now(),
            now(),
            p.id,
            src.priority_id,
            src.first_response_minutes,
            src.resolution_minutes
        FROM service_level_agreement_policy p
        JOIN service_level_agreement_policy src_policy
          ON src_policy.customer_id = (
              SELECT id FROM customer WHERE lower(name) = lower('HopDesk') LIMIT 1
          )
        JOIN service_level_agreement_priority_target src
          ON src.policy_id = src_policy.id
        WHERE p.customer_id IS NOT NULL
          AND p.id <> src_policy.id
          AND NOT EXISTS (
              SELECT 1
              FROM service_level_agreement_priority_target t
              WHERE t.policy_id = p.id
          )
        """
    )

    op.alter_column(
        "service_level_agreement_policy",
        "customer_id",
        existing_type=sa.Uuid(),
        nullable=False,
    )
    op.create_foreign_key(
        "fk_sla_policy_customer_id",
        "service_level_agreement_policy",
        "customer",
        ["customer_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_unique_constraint(
        "uq_sla_policy_customer_id",
        "service_level_agreement_policy",
        ["customer_id"],
    )

    op.create_table(
        "agent_customer_assignment",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customer.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "customer_id", name="uq_agent_customer_assignment"),
    )
    op.create_index(
        op.f("ix_agent_customer_assignment_id"),
        "agent_customer_assignment",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_customer_assignment_user_id"),
        "agent_customer_assignment",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_customer_assignment_customer_id"),
        "agent_customer_assignment",
        ["customer_id"],
        unique=False,
    )

    op.create_table(
        "agent_sector_assignment",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("assignment_id", sa.Uuid(), nullable=False),
        sa.Column("sector_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["assignment_id"],
            ["agent_customer_assignment.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["sector_id"], ["sector.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assignment_id", "sector_id", name="uq_agent_sector_assignment"),
    )
    op.create_index(
        op.f("ix_agent_sector_assignment_id"),
        "agent_sector_assignment",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_sector_assignment_assignment_id"),
        "agent_sector_assignment",
        ["assignment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_sector_assignment_sector_id"),
        "agent_sector_assignment",
        ["sector_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_agent_sector_assignment_sector_id"), table_name="agent_sector_assignment")
    op.drop_index(op.f("ix_agent_sector_assignment_assignment_id"), table_name="agent_sector_assignment")
    op.drop_index(op.f("ix_agent_sector_assignment_id"), table_name="agent_sector_assignment")
    op.drop_table("agent_sector_assignment")

    op.drop_index(op.f("ix_agent_customer_assignment_customer_id"), table_name="agent_customer_assignment")
    op.drop_index(op.f("ix_agent_customer_assignment_user_id"), table_name="agent_customer_assignment")
    op.drop_index(op.f("ix_agent_customer_assignment_id"), table_name="agent_customer_assignment")
    op.drop_table("agent_customer_assignment")

    op.drop_constraint("uq_sla_policy_customer_id", "service_level_agreement_policy", type_="unique")
    op.drop_constraint("fk_sla_policy_customer_id", "service_level_agreement_policy", type_="foreignkey")
    op.drop_index(
        op.f("ix_service_level_agreement_policy_customer_id"),
        table_name="service_level_agreement_policy",
    )
    op.drop_column("service_level_agreement_policy", "customer_id")
