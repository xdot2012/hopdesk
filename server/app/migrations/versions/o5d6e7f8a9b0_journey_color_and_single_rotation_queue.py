"""journey_color_and_single_rotation_queue

Revision ID: o5d6e7f8a9b0
Revises: n4c5d6e7f8a9
Create Date: 2026-08-22 20:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "o5d6e7f8a9b0"
down_revision: Union[str, None] = "n4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

JOURNEY_PALETTE = (
    "#2563EB",
    "#059669",
    "#D97706",
    "#DC2626",
    "#7C3AED",
    "#0891B2",
    "#DB2777",
    "#65A30D",
)


def upgrade() -> None:
    op.add_column(
        "attendance_policy",
        sa.Column("color", sa.String(length=7), nullable=True),
    )

    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id
            FROM attendance_policy
            ORDER BY created_at ASC
            """
        )
    ).fetchall()
    for index, row in enumerate(rows):
        color = JOURNEY_PALETTE[index % len(JOURNEY_PALETTE)]
        conn.execute(
            sa.text("UPDATE attendance_policy SET color = :color WHERE id = :id"),
            {"color": color, "id": row[0]},
        )

    op.alter_column("attendance_policy", "color", nullable=False)

    # Collapse to a single rotation queue: keep oldest, merge unique members, drop extras.
    queues = conn.execute(
        sa.text(
            """
            SELECT id
            FROM rotation_queue
            ORDER BY created_at ASC
            """
        )
    ).fetchall()
    if len(queues) > 1:
        keep_id = queues[0][0]
        keep_members = {
            row[0]
            for row in conn.execute(
                sa.text(
                    """
                    SELECT user_id
                    FROM rotation_queue_member
                    WHERE queue_id = :queue_id
                    ORDER BY position ASC
                    """
                ),
                {"queue_id": keep_id},
            ).fetchall()
        }
        next_position = len(keep_members)
        for queue_row in queues[1:]:
            extra_id = queue_row[0]
            for member in conn.execute(
                sa.text(
                    """
                    SELECT user_id
                    FROM rotation_queue_member
                    WHERE queue_id = :queue_id
                    ORDER BY position ASC
                    """
                ),
                {"queue_id": extra_id},
            ).fetchall():
                user_id = member[0]
                if user_id in keep_members:
                    continue
                conn.execute(
                    sa.text(
                        """
                        INSERT INTO rotation_queue_member
                            (id, queue_id, user_id, position, active, created_at, updated_at)
                        VALUES
                            (gen_random_uuid(), :queue_id, :user_id, :position, true, now(), now())
                        """
                    ),
                    {
                        "queue_id": keep_id,
                        "user_id": user_id,
                        "position": next_position,
                    },
                )
                keep_members.add(user_id)
                next_position += 1
            conn.execute(
                sa.text("DELETE FROM rotation_queue WHERE id = :id"),
                {"id": extra_id},
            )


def downgrade() -> None:
    op.drop_column("attendance_policy", "color")
