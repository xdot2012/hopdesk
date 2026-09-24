import datetime
from uuid import UUID

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session, joinedload

from app.core.roles import ROLE_ADMIN, ROLE_CUSTOMER
from app.core.slugify import slugify
from app.core.ticket_constants import (
    KNOWLEDGE_BASE_STATUS_ARCHIVED,
    KNOWLEDGE_BASE_STATUS_DRAFT,
    KNOWLEDGE_BASE_STATUS_PUBLISHED,
    KNOWLEDGE_BASE_VISIBILITY_PUBLIC,
    KNOWLEDGE_BASE_VISIBILITY_STAFF,
)
from app.models.knowledge_base.article import KnowledgeBaseArticle
from app.services.text_processor.service import TextProcessorService
from app.use_cases.knowledge_base.extract_article_keywords import extract_article_keywords
from app.use_cases.knowledge_base.sanitize_article_html import sanitize_article_html

MAX_ARTICLE_DEPTH = 6


def _slug_exists(db: Session, slug: str, *, exclude_id: UUID | None = None) -> bool:
    query = select(KnowledgeBaseArticle.id).where(KnowledgeBaseArticle.slug == slug)
    if exclude_id is not None:
        query = query.where(KnowledgeBaseArticle.id != exclude_id)
    return db.execute(query).first() is not None


def _unique_slug(db: Session, value: str, *, exclude_id: UUID | None = None) -> str:
    base_slug = slugify(value)
    slug = base_slug
    suffix = 1
    while _slug_exists(db, slug, exclude_id=exclude_id):
        suffix += 1
        slug = f"{base_slug}-{suffix}"
    return slug


def _effective_visibility(visibility: str | None) -> str:
    if visibility in (KNOWLEDGE_BASE_VISIBILITY_PUBLIC, KNOWLEDGE_BASE_VISIBILITY_STAFF):
        return visibility
    return KNOWLEDGE_BASE_VISIBILITY_PUBLIC


def _article_visible_to_customer(db: Session, article: KnowledgeBaseArticle) -> bool:
    current_id: UUID | None = article.id
    seen: set[UUID] = set()
    while current_id is not None:
        if current_id in seen:
            return False
        seen.add(current_id)
        row = db.execute(
            select(KnowledgeBaseArticle.visibility, KnowledgeBaseArticle.parent_id).where(
                KnowledgeBaseArticle.id == current_id
            )
        ).first()
        if not row:
            return False
        visibility, parent_id = row
        if _effective_visibility(visibility) != KNOWLEDGE_BASE_VISIBILITY_PUBLIC:
            return False
        current_id = parent_id
    return True


def _apply_visibility_filter(query, role_name: str):
    if role_name == ROLE_CUSTOMER:
        return query.where(
            or_(
                KnowledgeBaseArticle.visibility == KNOWLEDGE_BASE_VISIBILITY_PUBLIC,
                KnowledgeBaseArticle.visibility.is_(None),
            )
        )
    return query


def _children_count_map(db: Session, article_ids: list[UUID] | None = None) -> dict[UUID, int]:
    query = (
        select(KnowledgeBaseArticle.parent_id, func.count())
        .where(KnowledgeBaseArticle.parent_id.is_not(None))
        .group_by(KnowledgeBaseArticle.parent_id)
    )
    if article_ids is not None:
        if not article_ids:
            return {}
        query = query.where(KnowledgeBaseArticle.parent_id.in_(article_ids))
    rows = db.execute(query).all()
    return {parent_id: count for parent_id, count in rows if parent_id is not None}


def build_article_list_item(
    article: KnowledgeBaseArticle,
    *,
    children_count: int = 0,
) -> dict:
    return {
        "id": article.id,
        "parent_id": article.parent_id,
        "root_id": article.root_id,
        "title": article.title,
        "slug": article.slug,
        "status": article.status,
        "published_at": article.published_at,
        "view_count": article.view_count,
        "sort_order": article.sort_order or 0,
        "children_count": children_count,
        "visibility": _effective_visibility(article.visibility),
    }


def build_article_response(
    article: KnowledgeBaseArticle,
    *,
    children_count: int = 0,
    breadcrumb: list[dict] | None = None,
    children: list[dict] | None = None,
) -> dict:
    return {
        **build_article_list_item(article, children_count=children_count),
        "body": article.body,
        "keywords": list(article.keywords or []),
        "author_id": article.author_id,
        "author_name": article.author.name if article.author else None,
        "created_at": article.created_at,
        "updated_at": article.updated_at,
        "breadcrumb": breadcrumb or [],
        "children": children or [],
    }


def _resolve_root_id(db: Session, parent_id: UUID | None) -> UUID | None:
    if parent_id is None:
        return None
    parent = db.execute(
        select(KnowledgeBaseArticle).where(KnowledgeBaseArticle.id == parent_id)
    ).scalars().first()
    if not parent:
        return None
    if parent.parent_id is None:
        return parent.id
    return parent.root_id or parent.id


def _recompute_root_ids_for_subtree(db: Session, article_id: UUID, root_id: UUID) -> None:
    article = db.execute(
        select(KnowledgeBaseArticle).where(KnowledgeBaseArticle.id == article_id)
    ).scalars().first()
    if not article:
        return
    article.root_id = root_id
    db.add(article)
    children = db.execute(
        select(KnowledgeBaseArticle).where(KnowledgeBaseArticle.parent_id == article_id)
    ).scalars().all()
    for child in children:
        _recompute_root_ids_for_subtree(db, child.id, root_id)


async def list_articles(
    db: Session,
    *,
    role_name: str,
    published_only: bool = False,
    search: str | None = None,
    root_only: bool = False,
    parent_id: UUID | None = None,
    limit: int | None = None,
) -> list[KnowledgeBaseArticle]:
    query = select(KnowledgeBaseArticle).options(joinedload(KnowledgeBaseArticle.author))
    query = _apply_visibility_filter(query, role_name)
    if published_only:
        query = query.where(KnowledgeBaseArticle.status == KNOWLEDGE_BASE_STATUS_PUBLISHED)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(
            KnowledgeBaseArticle.title.ilike(pattern) | KnowledgeBaseArticle.body.ilike(pattern)
        )
    elif parent_id is not None:
        query = query.where(KnowledgeBaseArticle.parent_id == parent_id)
    elif root_only:
        query = query.where(KnowledgeBaseArticle.parent_id.is_(None))

    if search:
        query = query.order_by(KnowledgeBaseArticle.updated_at.desc())
    else:
        query = query.order_by(
            KnowledgeBaseArticle.sort_order.asc(),
            KnowledgeBaseArticle.title.asc(),
        )

    if limit is not None:
        query = query.limit(max(limit, 1))

    result = db.execute(query)
    articles = list(result.scalars().unique().all())
    if role_name == ROLE_CUSTOMER:
        articles = [article for article in articles if _article_visible_to_customer(db, article)]
    return articles


def list_articles_with_counts(
    articles: list[KnowledgeBaseArticle],
    db: Session,
) -> list[dict]:
    counts = _children_count_map(db, [article.id for article in articles])
    return [
        build_article_list_item(article, children_count=counts.get(article.id, 0))
        for article in articles
    ]


async def get_article(
    article_id: UUID,
    db: Session,
    *,
    role_name: str,
    published_only: bool = False,
) -> KnowledgeBaseArticle | None:
    query = (
        select(KnowledgeBaseArticle)
        .options(joinedload(KnowledgeBaseArticle.author))
        .where(KnowledgeBaseArticle.id == article_id)
    )
    query = _apply_visibility_filter(query, role_name)
    if published_only:
        query = query.where(KnowledgeBaseArticle.status == KNOWLEDGE_BASE_STATUS_PUBLISHED)
    result = db.execute(query)
    article = result.scalars().unique().first()
    if article and role_name == ROLE_CUSTOMER and not _article_visible_to_customer(db, article):
        return None
    return article


async def get_article_by_slug(
    slug: str,
    db: Session,
    *,
    role_name: str,
    published_only: bool = False,
) -> KnowledgeBaseArticle | None:
    query = (
        select(KnowledgeBaseArticle)
        .options(joinedload(KnowledgeBaseArticle.author))
        .where(KnowledgeBaseArticle.slug == slug.strip())
    )
    query = _apply_visibility_filter(query, role_name)
    if published_only:
        query = query.where(KnowledgeBaseArticle.status == KNOWLEDGE_BASE_STATUS_PUBLISHED)
    result = db.execute(query)
    article = result.scalars().unique().first()
    if article and role_name == ROLE_CUSTOMER and not _article_visible_to_customer(db, article):
        return None
    return article


async def get_article_by_ref(
    article_ref: str,
    db: Session,
    *,
    role_name: str,
    published_only: bool = False,
) -> KnowledgeBaseArticle | None:
    try:
        return await get_article(
            UUID(article_ref),
            db,
            role_name=role_name,
            published_only=published_only,
        )
    except ValueError:
        return await get_article_by_slug(
            article_ref,
            db,
            role_name=role_name,
            published_only=published_only,
        )


def _article_depth(article_id: UUID | None, db: Session) -> int:
    depth = 0
    current_id = article_id
    seen: set[UUID] = set()
    while current_id is not None:
        if current_id in seen:
            break
        seen.add(current_id)
        depth += 1
        parent_id = db.execute(
            select(KnowledgeBaseArticle.parent_id).where(KnowledgeBaseArticle.id == current_id)
        ).scalar_one_or_none()
        current_id = parent_id
    return depth


def _would_create_cycle(article_id: UUID, parent_id: UUID, db: Session) -> bool:
    if article_id == parent_id:
        return True
    current_id: UUID | None = parent_id
    seen: set[UUID] = set()
    while current_id is not None:
        if current_id == article_id:
            return True
        if current_id in seen:
            return True
        seen.add(current_id)
        current_id = db.execute(
            select(KnowledgeBaseArticle.parent_id).where(KnowledgeBaseArticle.id == current_id)
        ).scalar_one_or_none()
    return False


def validate_parent(
    *,
    db: Session,
    parent_id: UUID | None,
    article_id: UUID | None = None,
) -> str | None:
    if parent_id is None:
        return None

    parent = db.execute(
        select(KnowledgeBaseArticle).where(KnowledgeBaseArticle.id == parent_id)
    ).scalars().first()
    if not parent:
        return "parent_not_found"

    if article_id is not None and _would_create_cycle(article_id, parent_id, db):
        return "invalid_parent"

    parent_depth = _article_depth(parent_id, db)
    if parent_depth >= MAX_ARTICLE_DEPTH:
        return "max_depth"

    return None


def get_article_breadcrumb(article: KnowledgeBaseArticle, db: Session) -> list[dict]:
    crumbs: list[dict] = []
    current_id = article.parent_id
    seen: set[UUID] = set()
    while current_id is not None and current_id not in seen:
        seen.add(current_id)
        parent = db.execute(
            select(KnowledgeBaseArticle).where(KnowledgeBaseArticle.id == current_id)
        ).scalars().first()
        if not parent:
            break
        crumbs.append({"id": parent.id, "title": parent.title, "slug": parent.slug})
        current_id = parent.parent_id
    crumbs.reverse()
    return crumbs


def get_article_children(
    article_id: UUID,
    db: Session,
    *,
    role_name: str,
    published_only: bool = False,
) -> list[dict]:
    query = (
        select(KnowledgeBaseArticle)
        .where(KnowledgeBaseArticle.parent_id == article_id)
        .order_by(KnowledgeBaseArticle.sort_order, KnowledgeBaseArticle.title)
    )
    query = _apply_visibility_filter(query, role_name)
    if published_only:
        query = query.where(KnowledgeBaseArticle.status == KNOWLEDGE_BASE_STATUS_PUBLISHED)
    children = list(db.execute(query).scalars().all())
    counts = _children_count_map(db, [child.id for child in children])
    return [
        {
            "id": child.id,
            "title": child.title,
            "slug": child.slug,
            "status": child.status,
            "sort_order": child.sort_order or 0,
            "children_count": counts.get(child.id, 0),
        }
        for child in children
    ]


def build_full_article_response(
    article: KnowledgeBaseArticle,
    db: Session,
    *,
    role_name: str,
    published_only: bool = False,
) -> dict:
    counts = _children_count_map(db, [article.id])
    return build_article_response(
        article,
        children_count=counts.get(article.id, 0),
        breadcrumb=get_article_breadcrumb(article, db),
        children=get_article_children(
            article.id,
            db,
            role_name=role_name,
            published_only=published_only,
        ),
    )


def build_article_tree(
    articles: list[KnowledgeBaseArticle],
    db: Session,
) -> list[dict]:
    counts = _children_count_map(db, [article.id for article in articles])
    nodes: dict[UUID, dict] = {}
    for article in articles:
        node = build_article_list_item(article, children_count=counts.get(article.id, 0))
        node["children"] = []
        nodes[article.id] = node

    roots: list[dict] = []
    for article in articles:
        node = nodes[article.id]
        parent_id = article.parent_id
        if parent_id is not None and parent_id in nodes:
            nodes[parent_id]["children"].append(node)
        else:
            roots.append(node)

    def sort_nodes(items: list[dict]) -> None:
        items.sort(key=lambda item: (item.get("sort_order", 0), item.get("title", "")))
        for item in items:
            sort_nodes(item["children"])

    sort_nodes(roots)
    return roots


async def list_article_tree(
    db: Session,
    *,
    role_name: str,
    published_only: bool = False,
) -> list[dict]:
    articles = await list_articles(db, role_name=role_name, published_only=published_only)
    return build_article_tree(articles, db)


async def create_article(
    *,
    title: str,
    slug: str,
    body: str,
    status: str,
    author_id: UUID,
    db: Session,
    text_processor: TextProcessorService,
    language: str = "pt-BR",
    parent_id: UUID | None = None,
    sort_order: int = 0,
    visibility: str | None = None,
) -> tuple[KnowledgeBaseArticle | None, str | None]:
    parent_error = validate_parent(db=db, parent_id=parent_id)
    if parent_error:
        return None, parent_error

    if visibility not in (KNOWLEDGE_BASE_VISIBILITY_PUBLIC, KNOWLEDGE_BASE_VISIBILITY_STAFF):
        visibility = KNOWLEDGE_BASE_VISIBILITY_PUBLIC

    final_slug = _unique_slug(db, slug or title)

    if status not in (
        KNOWLEDGE_BASE_STATUS_DRAFT,
        KNOWLEDGE_BASE_STATUS_PUBLISHED,
        KNOWLEDGE_BASE_STATUS_ARCHIVED,
    ):
        status = KNOWLEDGE_BASE_STATUS_DRAFT

    clean_title = title.strip()
    clean_body = sanitize_article_html(body)
    keywords = extract_article_keywords(clean_title, clean_body, text_processor, language=language)

    article = KnowledgeBaseArticle(
        parent_id=parent_id,
        title=clean_title,
        slug=final_slug,
        body=clean_body,
        keywords=keywords,
        status=status,
        author_id=author_id,
        sort_order=sort_order,
        visibility=visibility,
        published_at=datetime.datetime.now() if status == KNOWLEDGE_BASE_STATUS_PUBLISHED else None,
    )
    db.add(article)
    db.flush()

    if parent_id is None:
        article.root_id = article.id
    else:
        article.root_id = _resolve_root_id(db, parent_id)

    db.add(article)
    db.commit()
    return await get_article(article.id, db, role_name=ROLE_ADMIN), None


async def update_article(
    *,
    article_id: UUID,
    db: Session,
    text_processor: TextProcessorService | None = None,
    language: str = "pt-BR",
    title: str | None = None,
    slug: str | None = None,
    body: str | None = None,
    status: str | None = None,
    parent_id: UUID | None = None,
    sort_order: int | None = None,
    visibility: str | None = None,
    clear_parent: bool = False,
) -> tuple[KnowledgeBaseArticle | None, str | None]:
    article = await get_article(article_id, db, role_name=ROLE_ADMIN)
    if not article:
        return None, "not_found"

    content_changed = False
    parent_changed = False

    if clear_parent:
        if article.parent_id is not None:
            parent_changed = True
        article.parent_id = None
    elif parent_id is not None:
        parent_error = validate_parent(db=db, parent_id=parent_id, article_id=article_id)
        if parent_error:
            return None, parent_error
        if article.parent_id != parent_id:
            parent_changed = True
        article.parent_id = parent_id

    if parent_changed:
        if article.parent_id is None:
            if article.visibility is None:
                article.visibility = KNOWLEDGE_BASE_VISIBILITY_PUBLIC
            article.root_id = article.id
            _recompute_root_ids_for_subtree(db, article.id, article.id)
        else:
            if article.visibility is None:
                article.visibility = KNOWLEDGE_BASE_VISIBILITY_PUBLIC
            new_root_id = _resolve_root_id(db, article.parent_id)
            if new_root_id:
                article.root_id = new_root_id
                _recompute_root_ids_for_subtree(db, article.id, new_root_id)

    if sort_order is not None:
        article.sort_order = sort_order

    if title is not None:
        new_title = title.strip()
        if new_title != article.title:
            article.title = new_title
            content_changed = True
            if slug is None:
                article.slug = _unique_slug(db, new_title, exclude_id=article_id)

    if slug is not None:
        final_slug = _unique_slug(db, slug, exclude_id=article_id)
        if final_slug != article.slug:
            article.slug = final_slug

    if body is not None:
        article.body = sanitize_article_html(body)
        content_changed = True

    if status is not None:
        if status not in (
            KNOWLEDGE_BASE_STATUS_DRAFT,
            KNOWLEDGE_BASE_STATUS_PUBLISHED,
            KNOWLEDGE_BASE_STATUS_ARCHIVED,
        ):
            return None, "not_found"
        if status == KNOWLEDGE_BASE_STATUS_PUBLISHED and article.status != KNOWLEDGE_BASE_STATUS_PUBLISHED:
            article.published_at = datetime.datetime.now()
        article.status = status

    if visibility is not None:
        if visibility not in (KNOWLEDGE_BASE_VISIBILITY_PUBLIC, KNOWLEDGE_BASE_VISIBILITY_STAFF):
            return None, "invalid_visibility"
        article.visibility = visibility

    if content_changed and text_processor is not None:
        article.keywords = extract_article_keywords(
            article.title,
            article.body,
            text_processor,
            language=language,
        )

    db.add(article)
    db.commit()
    return await get_article(article_id, db, role_name=ROLE_ADMIN), None


def _collect_subtree_ids(article_id: UUID, db: Session) -> list[UUID]:
    """Breadth-first list: root first, then descendants."""
    ordered: list[UUID] = []
    queue: list[UUID] = [article_id]
    seen: set[UUID] = set()
    while queue:
        current_id = queue.pop(0)
        if current_id in seen:
            continue
        seen.add(current_id)
        ordered.append(current_id)
        child_ids = list(
            db.execute(
                select(KnowledgeBaseArticle.id).where(
                    KnowledgeBaseArticle.parent_id == current_id
                )
            ).scalars().all()
        )
        queue.extend(child_ids)
    return ordered


async def delete_article(
    *,
    article_id: UUID,
    db: Session,
) -> str | None:
    article = await get_article(article_id, db, role_name=ROLE_ADMIN)
    if not article:
        return "not_found"

    subtree_ids = _collect_subtree_ids(article_id, db)
    # Neutralize self-FKs first so SET NULL / self-refs do not block the delete.
    db.execute(
        update(KnowledgeBaseArticle)
        .where(KnowledgeBaseArticle.id.in_(subtree_ids))
        .values(parent_id=None, root_id=None)
    )
    db.execute(
        delete(KnowledgeBaseArticle).where(KnowledgeBaseArticle.id.in_(subtree_ids))
    )
    db.commit()
    return None


async def reorder_articles(
    *,
    article_ids: list[UUID],
    db: Session,
    parent_id: UUID | None = None,
) -> str | None:
    if len(article_ids) != len(set(article_ids)):
        return "invalid_order"

    articles = list(
        db.execute(
            select(KnowledgeBaseArticle).where(KnowledgeBaseArticle.id.in_(article_ids))
        ).scalars().all()
    )
    if len(articles) != len(article_ids):
        return "not_found"

    if parent_id is not None:
        sibling_query = select(KnowledgeBaseArticle.id).where(
            KnowledgeBaseArticle.parent_id == parent_id
        )
        for article in articles:
            if article.parent_id != parent_id:
                return "invalid_scope"
    else:
        sibling_query = select(KnowledgeBaseArticle.id).where(
            KnowledgeBaseArticle.parent_id.is_(None),
        )
        for article in articles:
            if article.parent_id is not None:
                return "invalid_scope"

    sibling_ids = set(db.execute(sibling_query).scalars().all())
    if sibling_ids != set(article_ids):
        return "invalid_order"

    article_map = {article.id: article for article in articles}
    for index, article_id in enumerate(article_ids):
        article_map[article_id].sort_order = index

    db.commit()
    return None
