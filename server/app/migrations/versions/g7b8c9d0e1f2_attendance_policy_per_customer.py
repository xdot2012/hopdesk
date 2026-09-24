"""attendance_policy_per_customer

Revision ID: g7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-08-21 17:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "g7b8c9d0e1f2"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "attendance_policy",
        sa.Column("customer_id", sa.Uuid(), nullable=True),
    )
    op.create_index(
        op.f("ix_attendance_policy_customer_id"),
        "attendance_policy",
        ["customer_id"],
        unique=False,
    )

    op.execute(
        """
        INSERT INTO customer (id, created_at, updated_at, name)
        SELECT gen_random_uuid(), now(), now(), 'HopDesk'
        WHERE NOT EXISTS (
            SELECT 1 FROM customer WHERE lower(name) = lower('HopDesk')
        )
        """
    )

    # Attach the oldest existing policy to HopDesk.
    op.execute(
        """
        UPDATE attendance_policy
        SET customer_id = (SELECT id FROM customer WHERE lower(name) = lower('HopDesk') LIMIT 1)
        WHERE id = (
            SELECT id FROM attendance_policy ORDER BY created_at ASC LIMIT 1
        )
          AND customer_id IS NULL
        """
    )

    # Drop any leftover global policies (should be rare).
    op.execute(
        """
        DELETE FROM attendance_policy
        WHERE customer_id IS NULL
        """
    )

    # Ensure every customer has a policy (clone name/timezone from HopDesk source when present).
    op.execute(
        """
        INSERT INTO attendance_policy (id, created_at, updated_at, customer_id, name, timezone)
        SELECT
            gen_random_uuid(),
            now(),
            now(),
            c.id,
            COALESCE(src.name, 'Padrão'),
            COALESCE(src.timezone, 'America/Sao_Paulo')
        FROM customer c
        LEFT JOIN attendance_policy src
          ON src.customer_id = (
              SELECT id FROM customer WHERE lower(name) = lower('HopDesk') LIMIT 1
          )
        WHERE NOT EXISTS (
            SELECT 1 FROM attendance_policy p WHERE p.customer_id = c.id
        )
        """
    )

    # Copy week intervals from HopDesk source onto policies that have none.
    op.execute(
        """
        INSERT INTO attendance_week_interval (
            id, created_at, updated_at, policy_id, weekday, start_time, end_time
        )
        SELECT
            gen_random_uuid(),
            now(),
            now(),
            p.id,
            src.weekday,
            src.start_time,
            src.end_time
        FROM attendance_policy p
        JOIN attendance_policy src_policy
          ON src_policy.customer_id = (
              SELECT id FROM customer WHERE lower(name) = lower('HopDesk') LIMIT 1
          )
        JOIN attendance_week_interval src
          ON src.policy_id = src_policy.id
        WHERE p.customer_id IS NOT NULL
          AND p.id <> src_policy.id
          AND NOT EXISTS (
              SELECT 1
              FROM attendance_week_interval i
              WHERE i.policy_id = p.id
          )
        """
    )

    # Default Mon–Fri 09:00–18:00 for any policy still without intervals.
    op.execute(
        """
        INSERT INTO attendance_week_interval (
            id, created_at, updated_at, policy_id, weekday, start_time, end_time
        )
        SELECT
            gen_random_uuid(),
            now(),
            now(),
            p.id,
            d.weekday,
            TIME '09:00',
            TIME '18:00'
        FROM attendance_policy p
        CROSS JOIN (VALUES (0), (1), (2), (3), (4)) AS d(weekday)
        WHERE NOT EXISTS (
            SELECT 1 FROM attendance_week_interval i WHERE i.policy_id = p.id
        )
        """
    )

    # Copy holidays from HopDesk source onto policies that have none.
    op.execute(
        """
        INSERT INTO attendance_holiday (
            id, created_at, updated_at, policy_id, name, month, day, year, recurring_yearly
        )
        SELECT
            gen_random_uuid(),
            now(),
            now(),
            p.id,
            src.name,
            src.month,
            src.day,
            src.year,
            src.recurring_yearly
        FROM attendance_policy p
        JOIN attendance_policy src_policy
          ON src_policy.customer_id = (
              SELECT id FROM customer WHERE lower(name) = lower('HopDesk') LIMIT 1
          )
        JOIN attendance_holiday src
          ON src.policy_id = src_policy.id
        WHERE p.customer_id IS NOT NULL
          AND p.id <> src_policy.id
          AND NOT EXISTS (
              SELECT 1
              FROM attendance_holiday h
              WHERE h.policy_id = p.id
          )
        """
    )

    op.alter_column(
        "attendance_policy",
        "customer_id",
        existing_type=sa.Uuid(),
        nullable=False,
    )
    op.create_foreign_key(
        "fk_attendance_policy_customer_id",
        "attendance_policy",
        "customer",
        ["customer_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_unique_constraint(
        "uq_attendance_policy_customer_id",
        "attendance_policy",
        ["customer_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_attendance_policy_customer_id", "attendance_policy", type_="unique")
    op.drop_constraint("fk_attendance_policy_customer_id", "attendance_policy", type_="foreignkey")
    op.drop_index(op.f("ix_attendance_policy_customer_id"), table_name="attendance_policy")
    op.drop_column("attendance_policy", "customer_id")
