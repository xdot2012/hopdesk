"""customer_sectors

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-21 12:40:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sector",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customer.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("customer_id", "name", name="uq_sector_customer_name"),
    )
    op.create_index(op.f("ix_sector_id"), "sector", ["id"], unique=False)
    op.create_index(op.f("ix_sector_customer_id"), "sector", ["customer_id"], unique=False)

    op.add_column("customer_member", sa.Column("sector_id", sa.Uuid(), nullable=True))
    op.create_index(op.f("ix_customer_member_sector_id"), "customer_member", ["sector_id"], unique=False)
    op.create_foreign_key(
        "fk_customer_member_sector_id",
        "customer_member",
        "sector",
        ["sector_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_customer_member_sector_id", "customer_member", type_="foreignkey")
    op.drop_index(op.f("ix_customer_member_sector_id"), table_name="customer_member")
    op.drop_column("customer_member", "sector_id")

    op.drop_index(op.f("ix_sector_customer_id"), table_name="sector")
    op.drop_index(op.f("ix_sector_id"), table_name="sector")
    op.drop_table("sector")
