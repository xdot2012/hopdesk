"""agent_absence_and_rotation

Revision ID: m3b4c5d6e7f8
Revises: l2a3b4c5d6e7
Create Date: 2026-08-22 18:20:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "m3b4c5d6e7f8"
down_revision: Union[str, None] = "l2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_absence",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("substitute_user_id", sa.Uuid(), nullable=False),
        sa.Column("starts_at", sa.DateTime(), nullable=False),
        sa.Column("ends_at", sa.DateTime(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "ticket_handoff_policy",
            sa.String(length=20),
            server_default="keep",
            nullable=False,
        ),
        sa.Column("active", sa.Boolean(), server_default="true", nullable=False),
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
        sa.ForeignKeyConstraint(["substitute_user_id"], ["user.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_agent_absence_id"),
        "agent_absence",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_absence_substitute_user_id"),
        "agent_absence",
        ["substitute_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_absence_user_id"),
        "agent_absence",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "rotation_queue",
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column(
            "strategy",
            sa.String(length=40),
            server_default="round_robin",
            nullable=False,
        ),
        sa.Column("last_assigned_user_id", sa.Uuid(), nullable=True),
        sa.Column("active", sa.Boolean(), server_default="true", nullable=False),
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
        sa.ForeignKeyConstraint(
            ["last_assigned_user_id"],
            ["user.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_rotation_queue_id"),
        "rotation_queue",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_rotation_queue_last_assigned_user_id"),
        "rotation_queue",
        ["last_assigned_user_id"],
        unique=False,
    )

    op.create_table(
        "rotation_queue_member",
        sa.Column("queue_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), server_default="true", nullable=False),
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
        sa.ForeignKeyConstraint(["queue_id"], ["rotation_queue.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "queue_id",
            "user_id",
            name="uq_rotation_queue_member_queue_user",
        ),
    )
    op.create_index(
        op.f("ix_rotation_queue_member_id"),
        "rotation_queue_member",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_rotation_queue_member_queue_id"),
        "rotation_queue_member",
        ["queue_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_rotation_queue_member_user_id"),
        "rotation_queue_member",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_rotation_queue_member_user_id"),
        table_name="rotation_queue_member",
    )
    op.drop_index(
        op.f("ix_rotation_queue_member_queue_id"),
        table_name="rotation_queue_member",
    )
    op.drop_index(
        op.f("ix_rotation_queue_member_id"),
        table_name="rotation_queue_member",
    )
    op.drop_table("rotation_queue_member")
    op.drop_index(
        op.f("ix_rotation_queue_last_assigned_user_id"),
        table_name="rotation_queue",
    )
    op.drop_index(op.f("ix_rotation_queue_id"), table_name="rotation_queue")
    op.drop_table("rotation_queue")
    op.drop_index(op.f("ix_agent_absence_user_id"), table_name="agent_absence")
    op.drop_index(
        op.f("ix_agent_absence_substitute_user_id"),
        table_name="agent_absence",
    )
    op.drop_index(op.f("ix_agent_absence_id"), table_name="agent_absence")
    op.drop_table("agent_absence")
