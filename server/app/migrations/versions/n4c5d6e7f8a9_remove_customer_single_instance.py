"""remove_customer_single_instance

Revision ID: n4c5d6e7f8a9
Revises: m3b4c5d6e7f8
Create Date: 2026-08-22 19:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "n4c5d6e7f8a9"
down_revision: Union[str, None] = "m3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    customer_count = conn.execute(sa.text("SELECT count(*) FROM customer")).scalar_one()
    if customer_count > 1:
        raise RuntimeError(
            "Cannot remove multi-customer domain: more than one customer exists. "
            "Consolidate to a single customer (prefer 'HopDesk') before migrating."
        )

    # --- instance_settings from the sole customer (or default) ---
    op.create_table(
        "instance_settings",
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_instance_settings_id"), "instance_settings", ["id"], unique=False)
    op.execute(
        """
        INSERT INTO instance_settings (id, created_at, updated_at, timezone)
        SELECT
            gen_random_uuid(),
            now(),
            now(),
            COALESCE(
                (SELECT timezone FROM customer ORDER BY created_at ASC LIMIT 1),
                'America/Sao_Paulo'
            )
        WHERE NOT EXISTS (SELECT 1 FROM instance_settings)
        """
    )

    # --- rebuild agent_sector_assignment as user_id + sector_id ---
    op.execute(
        """
        CREATE TABLE agent_sector_assignment_new (
            user_id UUID NOT NULL,
            sector_id UUID NOT NULL,
            id UUID NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT uq_agent_sector_user_sector UNIQUE (user_id, sector_id),
            CONSTRAINT fk_agent_sector_asg_user_id FOREIGN KEY (user_id)
                REFERENCES "user"(id) ON DELETE CASCADE,
            CONSTRAINT fk_agent_sector_asg_sector_id FOREIGN KEY (sector_id)
                REFERENCES sector(id) ON DELETE CASCADE
        )
        """
    )
    op.execute(
        """
        INSERT INTO agent_sector_assignment_new (id, created_at, updated_at, user_id, sector_id)
        SELECT gen_random_uuid(), asa.created_at, asa.updated_at, aca.user_id, asa.sector_id
        FROM agent_sector_assignment asa
        JOIN agent_customer_assignment aca ON aca.id = asa.assignment_id
        """
    )
    op.drop_index(op.f("ix_agent_sector_assignment_sector_id"), table_name="agent_sector_assignment")
    op.drop_index(op.f("ix_agent_sector_assignment_assignment_id"), table_name="agent_sector_assignment")
    op.drop_index(op.f("ix_agent_sector_assignment_id"), table_name="agent_sector_assignment")
    op.drop_table("agent_sector_assignment")
    op.execute("ALTER TABLE agent_sector_assignment_new RENAME TO agent_sector_assignment")
    op.execute(
        "ALTER TABLE agent_sector_assignment "
        "RENAME CONSTRAINT uq_agent_sector_user_sector TO uq_agent_sector_assignment"
    )
    op.create_index(op.f("ix_agent_sector_assignment_id"), "agent_sector_assignment", ["id"], unique=False)
    op.create_index(
        op.f("ix_agent_sector_assignment_user_id"),
        "agent_sector_assignment",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_sector_assignment_sector_id"),
        "agent_sector_assignment",
        ["sector_id"],
        unique=False,
    )

    op.drop_index(op.f("ix_agent_customer_assignment_customer_id"), table_name="agent_customer_assignment")
    op.drop_index(op.f("ix_agent_customer_assignment_user_id"), table_name="agent_customer_assignment")
    op.drop_index(op.f("ix_agent_customer_assignment_id"), table_name="agent_customer_assignment")
    op.drop_table("agent_customer_assignment")

    # --- SLA: keep one policy, drop customer_id ---
    op.execute(
        """
        DELETE FROM service_level_agreement_priority_target
        WHERE policy_id NOT IN (
            SELECT id FROM service_level_agreement_policy
            ORDER BY created_at ASC
            LIMIT 1
        )
        """
    )
    op.execute(
        """
        UPDATE ticket
        SET service_level_agreement_policy_id = (
            SELECT id FROM service_level_agreement_policy ORDER BY created_at ASC LIMIT 1
        )
        WHERE service_level_agreement_policy_id IS NOT NULL
          AND service_level_agreement_policy_id NOT IN (
              SELECT id FROM service_level_agreement_policy
              ORDER BY created_at ASC
              LIMIT 1
          )
        """
    )
    op.execute(
        """
        DELETE FROM service_level_agreement_policy
        WHERE id NOT IN (
            SELECT id FROM (
                SELECT id FROM service_level_agreement_policy
                ORDER BY created_at ASC
                LIMIT 1
            ) keep_policy
        )
        """
    )
    op.drop_constraint("uq_sla_policy_customer_id", "service_level_agreement_policy", type_="unique")
    op.drop_constraint("fk_sla_policy_customer_id", "service_level_agreement_policy", type_="foreignkey")
    op.drop_index(
        op.f("ix_service_level_agreement_policy_customer_id"),
        table_name="service_level_agreement_policy",
    )
    op.drop_column("service_level_agreement_policy", "customer_id")

    # --- attendance: drop customer_id ---
    op.drop_constraint(
        "fk_attendance_holiday_customer_id",
        "attendance_holiday",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_attendance_holiday_customer_id"), table_name="attendance_holiday")
    op.drop_column("attendance_holiday", "customer_id")

    op.drop_constraint(
        "fk_attendance_policy_customer_id",
        "attendance_policy",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_attendance_policy_customer_id"), table_name="attendance_policy")
    op.drop_column("attendance_policy", "customer_id")

    # --- sector: drop customer_id, global unique name ---
    op.drop_index("uq_sector_customer_name_lower", table_name="sector")
    op.execute(
        """
        DO $$
        DECLARE r RECORD;
        BEGIN
            FOR r IN
                SELECT conname FROM pg_constraint
                WHERE conrelid = 'sector'::regclass AND contype = 'f'
                  AND pg_get_constraintdef(oid) ILIKE '%customer%'
            LOOP
                EXECUTE format('ALTER TABLE sector DROP CONSTRAINT %I', r.conname);
            END LOOP;
        END $$;
        """
    )
    op.drop_index(op.f("ix_sector_customer_id"), table_name="sector")
    op.drop_column("sector", "customer_id")
    op.create_index(
        "uq_sector_name_lower",
        "sector",
        [sa.text("lower(name)")],
        unique=True,
    )

    # --- portal_member from customer_member ---
    op.execute(
        """
        CREATE TABLE portal_member (
            user_id UUID NOT NULL,
            sector_id UUID,
            is_sector_manager BOOLEAN DEFAULT false NOT NULL,
            id UUID NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
            PRIMARY KEY (id),
            CONSTRAINT uq_portal_member_user_id UNIQUE (user_id),
            CONSTRAINT fk_portal_member_user_id FOREIGN KEY (user_id)
                REFERENCES "user"(id) ON DELETE CASCADE,
            CONSTRAINT fk_portal_member_sector_id FOREIGN KEY (sector_id)
                REFERENCES sector(id) ON DELETE SET NULL
        )
        """
    )
    op.execute(
        """
        INSERT INTO portal_member (id, created_at, updated_at, user_id, sector_id, is_sector_manager)
        SELECT DISTINCT ON (user_id)
            id, created_at, updated_at, user_id, sector_id, is_sector_manager
        FROM customer_member
        ORDER BY user_id, created_at ASC
        """
    )
    op.create_index(op.f("ix_portal_member_id"), "portal_member", ["id"], unique=False)
    op.create_index(op.f("ix_portal_member_user_id"), "portal_member", ["user_id"], unique=False)
    op.create_index(op.f("ix_portal_member_sector_id"), "portal_member", ["sector_id"], unique=False)

    op.drop_constraint("fk_customer_member_sector_id", "customer_member", type_="foreignkey")
    op.drop_index(op.f("ix_customer_member_sector_id"), table_name="customer_member")
    op.drop_index(op.f("ix_customer_member_user_id"), table_name="customer_member")
    op.drop_index(op.f("ix_customer_member_id"), table_name="customer_member")
    op.drop_index(op.f("ix_customer_member_customer_id"), table_name="customer_member")
    op.drop_table("customer_member")

    # --- ticket: drop customer_id ---
    op.execute(
        """
        DO $$
        DECLARE r RECORD;
        BEGIN
            FOR r IN
                SELECT conname FROM pg_constraint
                WHERE conrelid = 'ticket'::regclass AND contype = 'f'
                  AND pg_get_constraintdef(oid) ILIKE '%customer%'
            LOOP
                EXECUTE format('ALTER TABLE ticket DROP CONSTRAINT %I', r.conname);
            END LOOP;
        END $$;
        """
    )
    op.drop_index(op.f("ix_ticket_customer_id"), table_name="ticket")
    op.drop_column("ticket", "customer_id")

    # --- drop customer ---
    op.drop_index("uq_customer_name_lower", table_name="customer")
    op.drop_index(op.f("ix_customer_id"), table_name="customer")
    op.drop_table("customer")


def downgrade() -> None:
    raise NotImplementedError("Downgrade from single-instance is not supported")
