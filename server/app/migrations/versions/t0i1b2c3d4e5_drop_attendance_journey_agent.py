"""drop_attendance_journey_agent

Revision ID: t0i1b2c3d4e5
Revises: s9h0b1c2d3e4
Create Date: 2026-08-23 17:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "t0i1b2c3d4e5"
down_revision: Union[str, None] = "s9h0b1c2d3e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    queue_id = conn.execute(
        sa.text("SELECT id FROM rotation_queue ORDER BY created_at ASC LIMIT 1")
    ).scalar()

    if queue_id is None:
        queue_id = conn.execute(
            sa.text(
                """
                INSERT INTO rotation_queue (
                    id, name, strategy, mode_type, mode_units, active, created_at, updated_at
                )
                VALUES (
                    gen_random_uuid(), 'default', 'round_robin', 'days', 7, true, NOW(), NOW()
                )
                RETURNING id
                """
            )
        ).scalar()

    max_position = conn.execute(
        sa.text(
            """
            SELECT COALESCE(MAX(position), -1)
            FROM rotation_queue_member
            WHERE queue_id = :queue_id
            """
        ),
        {"queue_id": queue_id},
    ).scalar()

    conn.execute(
        sa.text(
            """
            INSERT INTO rotation_queue_member (
                id, queue_id, user_id, position, active, created_at, updated_at
            )
            SELECT
                gen_random_uuid(),
                :queue_id,
                ranked.user_id,
                :max_position + ranked.row_num,
                true,
                NOW(),
                NOW()
            FROM (
                SELECT
                    a.user_id,
                    ROW_NUMBER() OVER (ORDER BY a.created_at ASC) AS row_num
                FROM attendance_journey_agent a
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM rotation_queue_member m
                    WHERE m.queue_id = :queue_id
                      AND m.user_id = a.user_id
                )
            ) ranked
            """
        ),
        {"queue_id": queue_id, "max_position": max_position},
    )

    op.drop_index(op.f("ix_attendance_journey_agent_user_id"), table_name="attendance_journey_agent")
    op.drop_table("attendance_journey_agent")


def downgrade() -> None:
    op.create_table(
        "attendance_journey_agent",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_attendance_journey_agent_user_id"),
    )
    op.create_index(
        op.f("ix_attendance_journey_agent_user_id"),
        "attendance_journey_agent",
        ["user_id"],
        unique=False,
    )

    conn = op.get_bind()
    queue_id = conn.execute(
        sa.text("SELECT id FROM rotation_queue ORDER BY created_at ASC LIMIT 1")
    ).scalar()
    if queue_id is None:
        return

    conn.execute(
        sa.text(
            """
            INSERT INTO attendance_journey_agent (id, user_id, created_at, updated_at)
            SELECT gen_random_uuid(), m.user_id, NOW(), NOW()
            FROM rotation_queue_member m
            WHERE m.queue_id = :queue_id
              AND m.active = true
            ORDER BY m.position ASC
            """
        ),
        {"queue_id": queue_id},
    )
