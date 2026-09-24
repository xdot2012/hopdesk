"""kb_article_parent_and_sort

Revision ID: y5z6a7b8c9d0
Revises: x4y5z6a7b8c9
Create Date: 2026-08-25 22:15:00.000000

"""
import html
import re
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "y5z6a7b8c9d0"
down_revision: Union[str, None] = "x4y5z6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TAG_RE = re.compile(r"<[a-zA-Z/!?]")


def _plain_text_to_html(value: str) -> str:
    clean = (value or "").strip()
    if not clean:
        return "<p></p>"
    paragraphs = re.split(r"\n\s*\n", clean)
    parts: list[str] = []
    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        escaped = html.escape(paragraph).replace("\n", "<br>")
        parts.append(f"<p>{escaped}</p>")
    return "".join(parts) or "<p></p>"


def upgrade() -> None:
    op.add_column(
        "knowledge_base_article",
        sa.Column("parent_id", sa.Uuid(), nullable=True),
    )
    op.add_column(
        "knowledge_base_article",
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index(
        op.f("ix_knowledge_base_article_parent_id"),
        "knowledge_base_article",
        ["parent_id"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("fk_knowledge_base_article_parent_id"),
        "knowledge_base_article",
        "knowledge_base_article",
        ["parent_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.alter_column("knowledge_base_article", "sort_order", server_default=None)

    connection = op.get_bind()
    rows = connection.execute(sa.text("SELECT id, body FROM knowledge_base_article")).fetchall()
    for row in rows:
        body = row[1] or ""
        if _TAG_RE.search(body):
            continue
        connection.execute(
            sa.text("UPDATE knowledge_base_article SET body = :body WHERE id = :id"),
            {"body": _plain_text_to_html(body), "id": row[0]},
        )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_knowledge_base_article_parent_id"),
        "knowledge_base_article",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_knowledge_base_article_parent_id"), table_name="knowledge_base_article")
    op.drop_column("knowledge_base_article", "sort_order")
    op.drop_column("knowledge_base_article", "parent_id")
