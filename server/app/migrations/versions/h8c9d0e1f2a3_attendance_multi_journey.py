"""attendance_multi_journey

Revision ID: h8c9d0e1f2a3
Revises: g7b8c9d0e1f2
Create Date: 2026-08-21 18:20:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "h8c9d0e1f2a3"
down_revision: Union[str, None] = "g7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("uq_attendance_policy_customer_id", "attendance_policy", type_="unique")

    op.add_column(
        "attendance_holiday",
        sa.Column("customer_id", sa.Uuid(), nullable=True),
    )
    op.create_index(
        op.f("ix_attendance_holiday_customer_id"),
        "attendance_holiday",
        ["customer_id"],
        unique=False,
    )
    op.execute(
        """
        UPDATE attendance_holiday h
        SET customer_id = p.customer_id
        FROM attendance_policy p
        WHERE h.policy_id = p.id
          AND h.customer_id IS NULL
        """
    )
    op.alter_column(
        "attendance_holiday",
        "customer_id",
        existing_type=sa.Uuid(),
        nullable=False,
    )
    op.create_foreign_key(
        "fk_attendance_holiday_customer_id",
        "attendance_holiday",
        "customer",
        ["customer_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.create_table(
        "attendance_holiday_journey",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("holiday_id", sa.Uuid(), nullable=False),
        sa.Column("policy_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["holiday_id"], ["attendance_holiday.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["policy_id"], ["attendance_policy.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("holiday_id", "policy_id", name="uq_attendance_holiday_journey"),
    )
    op.create_index(
        op.f("ix_attendance_holiday_journey_holiday_id"),
        "attendance_holiday_journey",
        ["holiday_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_attendance_holiday_journey_policy_id"),
        "attendance_holiday_journey",
        ["policy_id"],
        unique=False,
    )
    op.execute(
        """
        INSERT INTO attendance_holiday_journey (id, created_at, updated_at, holiday_id, policy_id)
        SELECT gen_random_uuid(), now(), now(), h.id, h.policy_id
        FROM attendance_holiday h
        WHERE h.policy_id IS NOT NULL
        """
    )

    op.drop_constraint("attendance_holiday_policy_id_fkey", "attendance_holiday", type_="foreignkey")
    op.drop_index(op.f("ix_attendance_holiday_policy_id"), table_name="attendance_holiday")
    op.drop_column("attendance_holiday", "policy_id")

    op.create_table(
        "attendance_journey_agent",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("policy_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["policy_id"], ["attendance_policy.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("policy_id", "user_id", name="uq_attendance_journey_agent"),
    )
    op.create_index(
        op.f("ix_attendance_journey_agent_policy_id"),
        "attendance_journey_agent",
        ["policy_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_attendance_journey_agent_user_id"),
        "attendance_journey_agent",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_attendance_journey_agent_user_id"), table_name="attendance_journey_agent")
    op.drop_index(op.f("ix_attendance_journey_agent_policy_id"), table_name="attendance_journey_agent")
    op.drop_table("attendance_journey_agent")

    op.add_column(
        "attendance_holiday",
        sa.Column("policy_id", sa.Uuid(), nullable=True),
    )
    op.execute(
        """
        UPDATE attendance_holiday h
        SET policy_id = sub.policy_id
        FROM (
            SELECT DISTINCT ON (holiday_id) holiday_id, policy_id
            FROM attendance_holiday_journey
            ORDER BY holiday_id, created_at ASC
        ) sub
        WHERE h.id = sub.holiday_id
        """
    )
    op.execute(
        """
        UPDATE attendance_holiday h
        SET policy_id = (
            SELECT p.id FROM attendance_policy p
            WHERE p.customer_id = h.customer_id
            ORDER BY p.created_at ASC
            LIMIT 1
        )
        WHERE h.policy_id IS NULL
        """
    )
    op.alter_column(
        "attendance_holiday",
        "policy_id",
        existing_type=sa.Uuid(),
        nullable=False,
    )
    op.create_index(
        op.f("ix_attendance_holiday_policy_id"),
        "attendance_holiday",
        ["policy_id"],
        unique=False,
    )
    op.create_foreign_key(
        "attendance_holiday_policy_id_fkey",
        "attendance_holiday",
        "attendance_policy",
        ["policy_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_index(op.f("ix_attendance_holiday_journey_policy_id"), table_name="attendance_holiday_journey")
    op.drop_index(op.f("ix_attendance_holiday_journey_holiday_id"), table_name="attendance_holiday_journey")
    op.drop_table("attendance_holiday_journey")

    op.drop_constraint("fk_attendance_holiday_customer_id", "attendance_holiday", type_="foreignkey")
    op.drop_index(op.f("ix_attendance_holiday_customer_id"), table_name="attendance_holiday")
    op.drop_column("attendance_holiday", "customer_id")

    op.create_unique_constraint(
        "uq_attendance_policy_customer_id",
        "attendance_policy",
        ["customer_id"],
    )
