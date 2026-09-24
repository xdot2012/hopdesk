"""kb_category_metadata

Revision ID: z6a7b8c9d0e1
Revises: y5z6a7b8c9d0
Create Date: 2026-08-27 21:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "z6a7b8c9d0e1"
down_revision: Union[str, None] = "y5z6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "knowledge_base_category",
        sa.Column("description", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "knowledge_base_category",
        sa.Column("image_key", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "knowledge_base_category",
        sa.Column(
            "visibility",
            sa.String(length=20),
            nullable=False,
            server_default="public",
        ),
    )


def downgrade() -> None:
    op.drop_column("knowledge_base_category", "visibility")
    op.drop_column("knowledge_base_category", "image_key")
    op.drop_column("knowledge_base_category", "description")
