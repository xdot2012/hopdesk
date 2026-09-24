"""knowledge_base_article_keywords

Revision ID: i9d0e1f2a3b4
Revises: h8c9d0e1f2a3
Create Date: 2026-08-21 19:35:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "i9d0e1f2a3b4"
down_revision: Union[str, None] = "h8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "knowledge_base_article",
        sa.Column("keywords", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
    )
    op.alter_column("knowledge_base_article", "keywords", server_default=None)


def downgrade() -> None:
    op.drop_column("knowledge_base_article", "keywords")
