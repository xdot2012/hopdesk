"""drop_kb_article_cover_key

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-08-28 17:50:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "c9d0e1f2a3b4"
down_revision: Union[str, None] = "b8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("knowledge_base_article", "cover_key")


def downgrade() -> None:
    op.add_column(
        "knowledge_base_article",
        sa.Column("cover_key", sa.String(length=500), nullable=True),
    )
