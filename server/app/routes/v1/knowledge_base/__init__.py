from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status

from app.core.authz import require_roles
from app.core.errors import (
    FILE_UPLOAD_ERRORS,
    InvalidImageTypeException,
    KnowledgeBaseInvalidParentException,
    KnowledgeBaseMaxDepthException,
    KnowledgeBaseNotFoundException,
    KnowledgeBaseParentNotFoundException,
    KnowledgeBaseSlugExistsException,
    TicketNotFoundException,
)
from app.core.roles import ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER
from app.dependencies import DatabaseDependency, FileManagementDependency, LocaleDependency, TextProcessorDependency
from app.schemas.v1.knowledge_base import (
    CreateKnowledgeBaseArticleRequest,
    KnowledgeBaseArticleListItemResponse,
    KnowledgeBaseArticleResponse,
    KnowledgeBaseArticleSuggestionResponse,
    KnowledgeBaseArticleTreeNodeResponse,
    ReorderKnowledgeBaseArticlesRequest,
    SuggestKnowledgeBaseArticlesRequest,
    UpdateKnowledgeBaseArticleRequest,
    UploadKnowledgeBaseFileResponse,
)
from app.services.file_management.entities import AVATAR_ALLOWED_CONTENT_TYPES
from app.use_cases.knowledge_base.manage_knowledge_base import (
    build_full_article_response,
    create_article,
    delete_article,
    get_article,
    get_article_by_ref,
    list_article_tree,
    list_articles,
    list_articles_with_counts,
    reorder_articles,
    update_article,
)
from app.use_cases.knowledge_base.suggest_articles import (
    suggest_articles_for_text,
    suggest_articles_for_ticket,
)

router = APIRouter(prefix="/v1/knowledge_base", tags=["Knowledge Base"])

AnyAuth = Annotated[dict, Depends(require_roles(ROLE_CUSTOMER, ROLE_AGENT, ROLE_ADMIN))]
EditorAuth = Annotated[dict, Depends(require_roles(ROLE_AGENT, ROLE_ADMIN))]


def _raise_article_write_error(error: str | None, locale: str) -> None:
    if error == "slug_exists":
        raise KnowledgeBaseSlugExistsException(locale)
    if error == "parent_not_found":
        raise KnowledgeBaseParentNotFoundException(locale)
    if error in ("invalid_parent", "invalid_visibility"):
        raise KnowledgeBaseInvalidParentException(locale)
    if error == "max_depth":
        raise KnowledgeBaseMaxDepthException(locale)
    if error == "not_found":
        raise KnowledgeBaseNotFoundException(locale)
    if error in ("invalid_order", "invalid_scope"):
        raise KnowledgeBaseInvalidParentException(locale)


@router.get("/articles", response_model=list[KnowledgeBaseArticleListItemResponse])
async def list_articles_endpoint(
    token: AnyAuth,
    db: DatabaseDependency,
    search: str | None = Query(default=None),
    root_only: bool = Query(default=False, alias="rootOnly"),
    parent_id: UUID | None = Query(default=None, alias="parentId"),
    limit: int | None = Query(default=None, ge=1, le=100),
):
    published_only = token["role_name"] == ROLE_CUSTOMER
    articles = await list_articles(
        db,
        role_name=token["role_name"],
        published_only=published_only,
        search=search,
        root_only=root_only,
        parent_id=parent_id,
        limit=limit,
    )
    return list_articles_with_counts(articles, db)


@router.get("/articles/tree", response_model=list[KnowledgeBaseArticleTreeNodeResponse])
async def list_article_tree_endpoint(
    token: AnyAuth,
    db: DatabaseDependency,
):
    published_only = token["role_name"] == ROLE_CUSTOMER
    return await list_article_tree(
        db,
        role_name=token["role_name"],
        published_only=published_only,
    )


@router.post(
    "/articles/suggest",
    response_model=list[KnowledgeBaseArticleSuggestionResponse],
    tags=["Knowledge Base - Suggestions"],
)
async def suggest_articles_endpoint(
    data: SuggestKnowledgeBaseArticlesRequest,
    token: AnyAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    text_processor: TextProcessorDependency,
):
    if data.ticket_id is not None:
        suggestions = await suggest_articles_for_ticket(
            data.ticket_id,
            db,
            text_processor,
            role_name=token["role_name"],
            language=locale,
            limit=data.limit,
        )
        if suggestions is None:
            raise TicketNotFoundException(locale)
        return suggestions

    text = (data.text or "").strip()
    if not text:
        parts = [part.strip() for part in (data.subject or "", data.description or "") if part and part.strip()]
        text = "\n".join(parts)

    if not text:
        return []

    return await suggest_articles_for_text(
        text,
        db,
        text_processor,
        role_name=token["role_name"],
        language=locale,
        limit=data.limit,
    )


@router.post("/articles", response_model=KnowledgeBaseArticleResponse)
async def create_article_endpoint(
    data: CreateKnowledgeBaseArticleRequest,
    token: EditorAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    text_processor: TextProcessorDependency,
):
    article, error = await create_article(
        title=data.title,
        slug=data.slug or data.title,
        body=data.body,
        status=data.status,
        author_id=token["user_id"],
        db=db,
        text_processor=text_processor,
        language=locale,
        parent_id=data.parent_id,
        sort_order=data.sort_order,
        visibility=data.visibility,
    )
    _raise_article_write_error(error, locale)
    return build_full_article_response(article, db, role_name=token["role_name"])


@router.post("/articles/reorder")
async def reorder_articles_endpoint(
    data: ReorderKnowledgeBaseArticlesRequest,
    token: EditorAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
):
    error = await reorder_articles(
        article_ids=data.article_ids,
        db=db,
        parent_id=data.parent_id,
    )
    _raise_article_write_error(error, locale)


@router.get("/articles/{article_ref}", response_model=KnowledgeBaseArticleResponse)
async def get_article_endpoint(
    article_ref: str,
    token: AnyAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
):
    published_only = token["role_name"] == ROLE_CUSTOMER
    article = await get_article_by_ref(
        article_ref,
        db,
        role_name=token["role_name"],
        published_only=published_only,
    )
    if not article:
        raise KnowledgeBaseNotFoundException(locale)
    return build_full_article_response(
        article,
        db,
        role_name=token["role_name"],
        published_only=published_only,
    )


@router.patch("/articles/{article_id}", response_model=KnowledgeBaseArticleResponse)
async def update_article_endpoint(
    article_id: UUID,
    data: UpdateKnowledgeBaseArticleRequest,
    token: EditorAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    text_processor: TextProcessorDependency,
):
    article, error = await update_article(
        article_id=article_id,
        db=db,
        text_processor=text_processor,
        language=locale,
        title=data.title,
        slug=data.slug,
        body=data.body,
        status=data.status,
        parent_id=data.parent_id,
        sort_order=data.sort_order,
        visibility=data.visibility,
        clear_parent=data.clear_parent,
    )
    _raise_article_write_error(error, locale)
    return build_full_article_response(article, db, role_name=token["role_name"])


@router.delete(
    "/articles/{article_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Knowledge Base - Articles"],
)
async def delete_article_endpoint(
    article_id: UUID,
    token: EditorAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
):
    error = await delete_article(article_id=article_id, db=db)
    _raise_article_write_error(error, locale)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/articles/{article_id}/images", response_model=UploadKnowledgeBaseFileResponse)
async def upload_article_inline_image_endpoint(
    article_id: UUID,
    token: EditorAuth,
    locale: LocaleDependency,
    db: DatabaseDependency,
    file_service: FileManagementDependency,
    file: UploadFile = File(...),
):
    article = await get_article(article_id, db, role_name=token["role_name"])
    if not article:
        raise KnowledgeBaseNotFoundException(locale)

    content = await file.read()
    content_type = file.content_type or ""

    if content_type not in AVATAR_ALLOWED_CONTENT_TYPES:
        raise InvalidImageTypeException(locale)

    try:
        stored_file = await file_service.upload_knowledge_base_inline_image(
            content,
            content_type,
            article_id=str(article_id),
        )
    except ValueError as error:
        if str(error) in FILE_UPLOAD_ERRORS:
            raise FILE_UPLOAD_ERRORS[str(error)](locale)
        raise InvalidImageTypeException(locale)

    return UploadKnowledgeBaseFileResponse(key=stored_file["key"], url=stored_file["url"])
