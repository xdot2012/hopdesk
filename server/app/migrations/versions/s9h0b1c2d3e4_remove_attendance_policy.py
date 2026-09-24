"""remove_attendance_policy

Revision ID: s9h0b1c2d3e4
Revises: r8g9a0b1c2d3
Create Date: 2026-08-23 16:45:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "s9h0b1c2d3e4"
down_revision: Union[str, None] = "r8g9a0b1c2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    keep_policy = conn.execute(
        sa.text(
            """
            SELECT id
            FROM attendance_policy
            ORDER BY created_at ASC
            LIMIT 1
            """
        )
    ).scalar()

    if keep_policy:
        conn.execute(
            sa.text(
                """
                DELETE FROM attendance_week_interval
                WHERE policy_id IS DISTINCT FROM :keep_id
                """
            ),
            {"keep_id": keep_policy},
        )

    conn.execute(
        sa.text(
            """
            DELETE FROM attendance_journey_agent a
            USING attendance_journey_agent b
            WHERE a.user_id = b.user_id
              AND a.created_at > b.created_at
            """
        )
    )

    op.drop_index(
        op.f("ix_attendance_holiday_journey_holiday_id"),
        table_name="attendance_holiday_journey",
    )
    op.drop_index(
        op.f("ix_attendance_holiday_journey_policy_id"),
        table_name="attendance_holiday_journey",
    )
    op.drop_table("attendance_holiday_journey")

    op.drop_constraint(
        "attendance_week_interval_policy_id_fkey",
        "attendance_week_interval",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_attendance_week_interval_policy_id"),
        table_name="attendance_week_interval",
    )
    op.drop_column("attendance_week_interval", "policy_id")

    op.drop_constraint("uq_attendance_journey_agent", "attendance_journey_agent", type_="unique")
    op.drop_constraint(
        "attendance_journey_agent_policy_id_fkey",
        "attendance_journey_agent",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_attendance_journey_agent_policy_id"),
        table_name="attendance_journey_agent",
    )
    op.drop_column("attendance_journey_agent", "policy_id")
    op.create_unique_constraint(
        "uq_attendance_journey_agent_user_id",
        "attendance_journey_agent",
        ["user_id"],
    )

    op.drop_index(op.f("ix_attendance_policy_id"), table_name="attendance_policy")
    op.drop_table("attendance_policy")


def downgrade() -> None:
    pass
