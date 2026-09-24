"""kb_merge_category_into_pages

Revision ID: a7b8c9d0e1f2
Revises: z6a7b8c9d0e1
Create Date: 2026-08-27 23:00:00.000000

"""
from typing import Sequence, Union
from uuid import uuid4

import sqlalchemy as sa
from alembic import op


revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "z6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _slug_exists(connection, slug: str, exclude_id=None) -> bool:
    query = "SELECT id FROM knowledge_base_article WHERE slug = :slug"
    params = {"slug": slug}
    if exclude_id:
        query += " AND id != :exclude_id"
        params["exclude_id"] = exclude_id
    return connection.execute(sa.text(query), params).first() is not None


def _unique_hub_slug(connection, base_slug: str) -> str:
    slug = base_slug
    suffix = 0
    while _slug_exists(connection, slug):
        suffix += 1
        slug = f"{base_slug}-hub" if suffix == 1 else f"{base_slug}-hub-{suffix}"
    return slug


def _recompute_root_ids(connection) -> None:
    roots = connection.execute(
        sa.text("SELECT id FROM knowledge_base_article WHERE parent_id IS NULL")
    ).fetchall()
    for (root_id,) in roots:
        connection.execute(
            sa.text("UPDATE knowledge_base_article SET root_id = :root_id WHERE id = :root_id"),
            {"root_id": root_id},
        )
        pending = [root_id]
        while pending:
            parent_id = pending.pop()
            children = connection.execute(
                sa.text(
                    "SELECT id FROM knowledge_base_article WHERE parent_id = :parent_id"
                ),
                {"parent_id": parent_id},
            ).fetchall()
            for (child_id,) in children:
                connection.execute(
                    sa.text(
                        "UPDATE knowledge_base_article SET root_id = :root_id WHERE id = :child_id"
                    ),
                    {"root_id": root_id, "child_id": child_id},
                )
                pending.append(child_id)


def upgrade() -> None:
    op.add_column(
        "knowledge_base_article",
        sa.Column("cover_key", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "knowledge_base_article",
        sa.Column("visibility", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "knowledge_base_article",
        sa.Column("root_id", sa.Uuid(), nullable=True),
    )
    op.create_index(
        op.f("ix_knowledge_base_article_root_id"),
        "knowledge_base_article",
        ["root_id"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("fk_knowledge_base_article_root_id"),
        "knowledge_base_article",
        "knowledge_base_article",
        ["root_id"],
        ["id"],
        ondelete="SET NULL",
    )

    connection = op.get_bind()

    categories = connection.execute(
        sa.text(
            """
            SELECT id, name, slug, image_key, visibility, sort_order
            FROM knowledge_base_category
            ORDER BY sort_order, name
            """
        )
    ).fetchall()

    default_author = connection.execute(
        sa.text("SELECT id FROM \"user\" ORDER BY created_at ASC LIMIT 1")
    ).scalar()

    for category_id, name, slug, image_key, visibility, sort_order in categories:
        hub_id = uuid4()
        hub_slug = _unique_hub_slug(connection, slug)
        hub_visibility = visibility or "public"

        connection.execute(
            sa.text(
                """
                INSERT INTO knowledge_base_article (
                    id, category_id, parent_id, title, slug, body, keywords,
                    status, author_id, published_at, view_count, sort_order,
                    cover_key, visibility, root_id, created_at, updated_at
                )
                VALUES (
                    :id, :category_id, NULL, :title, :slug, '<p></p>', '[]'::json,
                    'published', :author_id, NOW(), 0, :sort_order,
                    :cover_key, :visibility, :id, NOW(), NOW()
                )
                """
            ),
            {
                "id": hub_id,
                "category_id": category_id,
                "title": name,
                "slug": hub_slug,
                "author_id": default_author,
                "sort_order": sort_order or 0,
                "cover_key": image_key,
                "visibility": hub_visibility,
            },
        )

        connection.execute(
            sa.text(
                """
                UPDATE knowledge_base_article
                SET parent_id = :hub_id
                WHERE category_id = :category_id AND parent_id IS NULL AND id != :hub_id
                """
            ),
            {"hub_id": hub_id, "category_id": category_id},
        )

    _recompute_root_ids(connection)

    op.drop_constraint(
        op.f("knowledge_base_article_category_id_fkey"),
        "knowledge_base_article",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_knowledge_base_article_category_id"),
        table_name="knowledge_base_article",
    )
    op.drop_column("knowledge_base_article", "category_id")
    op.drop_index(op.f("ix_knowledge_base_category_id"), table_name="knowledge_base_category")
    op.drop_table("knowledge_base_category")


def downgrade() -> None:
    op.create_table(
        "knowledge_base_category",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=200), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("image_key", sa.String(length=500), nullable=True),
        sa.Column("visibility", sa.String(length=20), server_default="public", nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(
        op.f("ix_knowledge_base_category_id"),
        "knowledge_base_category",
        ["id"],
        unique=False,
    )

    op.add_column(
        "knowledge_base_article",
        sa.Column("category_id", sa.Uuid(), nullable=True),
    )

    connection = op.get_bind()
    default_category_id = uuid4()
    connection.execute(
        sa.text(
            """
            INSERT INTO knowledge_base_category (id, name, slug, sort_order, visibility, created_at, updated_at)
            VALUES (:id, 'General', 'general', 0, 'public', NOW(), NOW())
            """
        ),
        {"id": default_category_id},
    )
    connection.execute(
        sa.text(
            "UPDATE knowledge_base_article SET category_id = :category_id"
        ),
        {"category_id": default_category_id},
    )

    op.alter_column("knowledge_base_article", "category_id", nullable=False)
    op.create_index(
        op.f("ix_knowledge_base_article_category_id"),
        "knowledge_base_article",
        ["category_id"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("knowledge_base_article_category_id_fkey"),
        "knowledge_base_article",
        "knowledge_base_category",
        ["category_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint(
        op.f("fk_knowledge_base_article_root_id"),
        "knowledge_base_article",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_knowledge_base_article_root_id"),
        table_name="knowledge_base_article",
    )
    op.drop_column("knowledge_base_article", "root_id")
    op.drop_column("knowledge_base_article", "visibility")
    op.drop_column("knowledge_base_article", "cover_key")
