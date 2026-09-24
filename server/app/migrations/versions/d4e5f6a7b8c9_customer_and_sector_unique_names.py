"""customer_and_sector_unique_names

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-08-21 12:50:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DELETE FROM customer a
        USING customer b
        WHERE a.id > b.id
          AND lower(a.name) = lower(b.name)
        """
    )
    op.create_index(
        "uq_customer_name_lower",
        "customer",
        [sa.text("lower(name)")],
        unique=True,
    )

    op.drop_constraint("uq_sector_customer_name", "sector", type_="unique")
    op.execute(
        """
        DELETE FROM sector a
        USING sector b
        WHERE a.id > b.id
          AND a.customer_id = b.customer_id
          AND lower(a.name) = lower(b.name)
        """
    )
    op.create_index(
        "uq_sector_customer_name_lower",
        "sector",
        ["customer_id", sa.text("lower(name)")],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_sector_customer_name_lower", table_name="sector")
    op.create_unique_constraint(
        "uq_sector_customer_name",
        "sector",
        ["customer_id", "name"],
    )
    op.drop_index("uq_customer_name_lower", table_name="customer")
