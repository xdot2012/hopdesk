"""drop_unused_agent_tables

Revision ID: m9n0o1p2q3r4
Revises: l8m9n0o1p2q3
Create Date: 2026-09-23 14:15:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "m9n0o1p2q3r4"
down_revision: Union[str, None] = "l8m9n0o1p2q3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(
        op.f("ix_agent_schedule_interval_schedule_id"),
        table_name="agent_schedule_interval",
    )
    op.drop_index(op.f("ix_agent_schedule_interval_id"), table_name="agent_schedule_interval")
    op.drop_table("agent_schedule_interval")

    op.drop_index(op.f("ix_agent_schedule_user_id"), table_name="agent_schedule")
    op.drop_index(op.f("ix_agent_schedule_id"), table_name="agent_schedule")
    op.drop_table("agent_schedule")

    op.drop_index(
        op.f("ix_agent_sector_assignment_sector_id"),
        table_name="agent_sector_assignment",
    )
    op.drop_index(
        op.f("ix_agent_sector_assignment_user_id"),
        table_name="agent_sector_assignment",
    )
    op.drop_index(op.f("ix_agent_sector_assignment_id"), table_name="agent_sector_assignment")
    op.drop_table("agent_sector_assignment")


def downgrade() -> None:
    op.create_table(
        "agent_sector_assignment",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("sector_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sector_id"], ["sector.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "sector_id", name="uq_agent_sector_assignment"),
    )
    op.create_index(
        op.f("ix_agent_sector_assignment_id"),
        "agent_sector_assignment",
        ["id"],
        unique=False,
    )
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
    op.create_index(
        op.f("ix_agent_schedule_interval_id"),
        "agent_schedule_interval",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_schedule_interval_schedule_id"),
        "agent_schedule_interval",
        ["schedule_id"],
        unique=False,
    )
