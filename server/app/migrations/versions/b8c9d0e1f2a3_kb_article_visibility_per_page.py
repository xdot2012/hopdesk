"""kb_article_visibility_per_page

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-08-27 23:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE knowledge_base_article AS child
            SET visibility = root.visibility
            FROM knowledge_base_article AS root
            WHERE child.visibility IS NULL
              AND child.root_id = root.id
              AND root.visibility IS NOT NULL
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE knowledge_base_article
            SET visibility = 'public'
            WHERE visibility IS NULL
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE knowledge_base_article
            SET visibility = NULL
            WHERE parent_id IS NOT NULL
            """
        )
    )
