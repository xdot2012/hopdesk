"""single_journey

Revision ID: r8g9a0b1c2d3
Revises: q7f8a9b0c1d2
Create Date: 2026-08-23 16:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "r8g9a0b1c2d3"
down_revision: Union[str, None] = "q7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    journeys = conn.execute(
        sa.text(
            """
            SELECT id
            FROM attendance_policy
            ORDER BY created_at ASC
            """
        )
    ).fetchall()

    if len(journeys) <= 1:
        return

    keep_id = journeys[0][0]
    for journey_row in journeys[1:]:
        extra_id = journey_row[0]

        conn.execute(
            sa.text(
                """
                INSERT INTO attendance_journey_agent
                    (id, policy_id, user_id, created_at, updated_at)
                SELECT
                    gen_random_uuid(),
                    :keep_id,
                    user_id,
                    now(),
                    now()
                FROM attendance_journey_agent
                WHERE policy_id = :extra_id
                ON CONFLICT (policy_id, user_id) DO NOTHING
                """
            ),
            {"keep_id": keep_id, "extra_id": extra_id},
        )

        conn.execute(
            sa.text(
                """
                INSERT INTO attendance_holiday_journey
                    (id, holiday_id, policy_id, created_at, updated_at)
                SELECT
                    gen_random_uuid(),
                    holiday_id,
                    :keep_id,
                    now(),
                    now()
                FROM attendance_holiday_journey
                WHERE policy_id = :extra_id
                ON CONFLICT (holiday_id, policy_id) DO NOTHING
                """
            ),
            {"keep_id": keep_id, "extra_id": extra_id},
        )

        conn.execute(
            sa.text("DELETE FROM attendance_policy WHERE id = :id"),
            {"id": extra_id},
        )


def downgrade() -> None:
    pass
