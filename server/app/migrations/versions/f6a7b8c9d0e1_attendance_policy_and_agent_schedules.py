"""attendance_policy_and_agent_schedules

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-08-21 16:10:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "attendance_policy",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_attendance_policy_id"), "attendance_policy", ["id"], unique=False)

    op.create_table(
        "attendance_week_interval",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("policy_id", sa.Uuid(), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.ForeignKeyConstraint(["policy_id"], ["attendance_policy.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_attendance_week_interval_id"), "attendance_week_interval", ["id"], unique=False)
    op.create_index(
        op.f("ix_attendance_week_interval_policy_id"),
        "attendance_week_interval",
        ["policy_id"],
        unique=False,
    )

    op.create_table(
        "attendance_holiday",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("policy_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("day", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("recurring_yearly", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["policy_id"], ["attendance_policy.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_attendance_holiday_id"), "attendance_holiday", ["id"], unique=False)
    op.create_index(
        op.f("ix_attendance_holiday_policy_id"),
        "attendance_holiday",
        ["policy_id"],
        unique=False,
    )

    op.create_table(
        "agent_schedule",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_agent_schedule_id"), "agent_schedule", ["id"], unique=False)
    op.create_index(op.f("ix_agent_schedule_user_id"), "agent_schedule", ["user_id"], unique=False)

    op.create_table(
        "agent_schedule_interval",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("schedule_id", sa.Uuid(), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.ForeignKeyConstraint(["schedule_id"], ["agent_schedule.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_agent_schedule_interval_id"), "agent_schedule_interval", ["id"], unique=False)
    op.create_index(
        op.f("ix_agent_schedule_interval_schedule_id"),
        "agent_schedule_interval",
        ["schedule_id"],
        unique=False,
    )

    op.create_table(
        "agent_break",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=True),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("starts_at", sa.DateTime(), nullable=True),
        sa.Column("ends_at", sa.DateTime(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_agent_break_id"), "agent_break", ["id"], unique=False)
    op.create_index(op.f("ix_agent_break_user_id"), "agent_break", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_agent_break_user_id"), table_name="agent_break")
    op.drop_index(op.f("ix_agent_break_id"), table_name="agent_break")
    op.drop_table("agent_break")
    op.drop_index(op.f("ix_agent_schedule_interval_schedule_id"), table_name="agent_schedule_interval")
    op.drop_index(op.f("ix_agent_schedule_interval_id"), table_name="agent_schedule_interval")
    op.drop_table("agent_schedule_interval")
    op.drop_index(op.f("ix_agent_schedule_user_id"), table_name="agent_schedule")
    op.drop_index(op.f("ix_agent_schedule_id"), table_name="agent_schedule")
    op.drop_table("agent_schedule")
    op.drop_index(op.f("ix_attendance_holiday_policy_id"), table_name="attendance_holiday")
    op.drop_index(op.f("ix_attendance_holiday_id"), table_name="attendance_holiday")
    op.drop_table("attendance_holiday")
    op.drop_index(op.f("ix_attendance_week_interval_policy_id"), table_name="attendance_week_interval")
    op.drop_index(op.f("ix_attendance_week_interval_id"), table_name="attendance_week_interval")
    op.drop_table("attendance_week_interval")
    op.drop_index(op.f("ix_attendance_policy_id"), table_name="attendance_policy")
    op.drop_table("attendance_policy")
