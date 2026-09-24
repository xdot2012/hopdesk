from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.ticket_constants import KNOWLEDGE_BASE_STATUS_PUBLISHED
from app.models.knowledge_base.article import KnowledgeBaseArticle
from app.models.ticket.ticket import Ticket
from app.services.text_processor.service import TextProcessorService
from app.use_cases.knowledge_base.extract_article_keywords import extract_article_keywords
from app.use_cases.knowledge_base.manage_knowledge_base import (
    _apply_visibility_filter,
    build_article_list_item,
)

_DEFAULT_LIMIT = 5
_MIN_SCORE = 0.15


def _normalize_keyword(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _keyword_tokens(keyword: str) -> set[str]:
    return {part for part in _normalize_keyword(keyword).split() if part}


def score_keyword_overlap(query_keywords: list[str], article_keywords: list[str]) -> float:
    query = [_normalize_keyword(item) for item in query_keywords if item and item.strip()]
    article = [_normalize_keyword(item) for item in article_keywords if item and item.strip()]
    if not query or not article:
        return 0.0

    query_set = set(query)
    article_set = set(article)
    exact = query_set & article_set

    partial = 0.0
    unmatched_query = query_set - exact
    for query_keyword in unmatched_query:
        query_parts = _keyword_tokens(query_keyword)
        if not query_parts:
            continue
        for article_keyword in article_set:
            article_parts = _keyword_tokens(article_keyword)
            if not article_parts:
                continue
            if query_parts <= article_parts or article_parts <= query_parts:
                partial += 0.5
                break
            if query_parts & article_parts:
                partial += 0.25
                break

    score = (len(exact) + partial) / len(query_set)
    return min(score, 1.0)


async def ensure_article_keywords(
    article: KnowledgeBaseArticle,
    text_processor: TextProcessorService,
    db: Session,
    *,
    language: str = "pt-BR",
    commit: bool = True,
) -> list[str]:
    keywords = list(article.keywords or [])
    if keywords:
        return keywords

    keywords = extract_article_keywords(
        article.title,
        article.body,
        text_processor,
        language=language,
    )
    article.keywords = keywords
    db.add(article)
    if commit:
        db.commit()
    return keywords


async def suggest_articles_for_text(
    text: str,
    db: Session,
    text_processor: TextProcessorService,
    *,
    role_name: str,
    language: str = "pt-BR",
    limit: int = _DEFAULT_LIMIT,
) -> list[dict]:
    try:
        query_keywords = text_processor.extract_keywords(text, language, limit=20)
    except ValueError:
        return []

    if not query_keywords:
        return []

    query = (
        select(KnowledgeBaseArticle)
        .options(joinedload(KnowledgeBaseArticle.author))
        .where(KnowledgeBaseArticle.status == KNOWLEDGE_BASE_STATUS_PUBLISHED)
        .order_by(KnowledgeBaseArticle.updated_at.desc())
    )
    query = _apply_visibility_filter(query, role_name)
    articles = list(db.execute(query).scalars().unique().all())

    scored: list[tuple[float, KnowledgeBaseArticle]] = []
    for article in articles:
        article_keywords = await ensure_article_keywords(
            article,
            text_processor,
            db,
            language=language,
            commit=False,
        )
        score = score_keyword_overlap(query_keywords, article_keywords)
        if score >= _MIN_SCORE:
            scored.append((score, article))

    db.commit()
    scored.sort(key=lambda item: (item[0], item[1].view_count), reverse=True)

    suggestions: list[dict] = []
    for score, article in scored[: max(limit, 1)]:
        suggestions.append(
            {
                **build_article_list_item(article),
                "keywords": list(article.keywords or []),
                "score": round(score, 4),
            }
        )
    return suggestions


async def suggest_articles_for_ticket(
    ticket_id: UUID,
    db: Session,
    text_processor: TextProcessorService,
    *,
    role_name: str,
    language: str = "pt-BR",
    limit: int = _DEFAULT_LIMIT,
) -> list[dict] | None:
    ticket = db.execute(select(Ticket).where(Ticket.id == ticket_id)).scalars().first()
    if not ticket:
        return None

    text = f"{ticket.subject}\n{ticket.description}".strip()
    return await suggest_articles_for_text(
        text,
        db,
        text_processor,
        role_name=role_name,
        language=language,
        limit=limit,
    )
