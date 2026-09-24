import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import Field

from app.schemas.v1.base import RequestBaseModel, ResponseBaseModel


class KnowledgeBaseArticleBreadcrumbItem(ResponseBaseModel):
    id: UUID
    title: str
    slug: str


class KnowledgeBaseArticleListItemResponse(ResponseBaseModel):
    id: UUID
    parent_id: Optional[UUID] = None
    root_id: Optional[UUID] = None
    title: str
    slug: str
    status: str
    published_at: Optional[datetime.datetime] = None
    view_count: int
    sort_order: int = 0
    children_count: int = 0
    visibility: Optional[str] = None


class KnowledgeBaseArticleChildResponse(ResponseBaseModel):
    id: UUID
    title: str
    slug: str
    status: str
    sort_order: int = 0
    children_count: int = 0


class KnowledgeBaseArticleResponse(KnowledgeBaseArticleListItemResponse):
    body: str
    keywords: List[str] = Field(default_factory=list)
    author_id: UUID
    author_name: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    breadcrumb: List[KnowledgeBaseArticleBreadcrumbItem] = Field(default_factory=list)
    children: List[KnowledgeBaseArticleChildResponse] = Field(default_factory=list)


class KnowledgeBaseArticleTreeNodeResponse(KnowledgeBaseArticleListItemResponse):
    children: List["KnowledgeBaseArticleTreeNodeResponse"] = Field(default_factory=list)


class KnowledgeBaseArticleSuggestionResponse(KnowledgeBaseArticleListItemResponse):
    keywords: List[str] = Field(default_factory=list)
    score: float


class UploadKnowledgeBaseFileResponse(ResponseBaseModel):
    key: str
    url: str


class CreateKnowledgeBaseArticleRequest(RequestBaseModel):
    title: str = Field(min_length=2, max_length=300)
    slug: Optional[str] = Field(default=None, min_length=2, max_length=300)
    body: str = Field(min_length=1)
    status: str = "draft"
    parent_id: Optional[UUID] = None
    sort_order: int = 0
    visibility: Optional[str] = None


class UpdateKnowledgeBaseArticleRequest(RequestBaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=300)
    slug: Optional[str] = Field(default=None, min_length=2, max_length=300)
    body: Optional[str] = None
    status: Optional[str] = None
    parent_id: Optional[UUID] = None
    sort_order: Optional[int] = None
    visibility: Optional[str] = None
    clear_parent: bool = False


class ReorderKnowledgeBaseArticlesRequest(RequestBaseModel):
    article_ids: List[UUID] = Field(min_length=1)
    parent_id: Optional[UUID] = None


class SuggestKnowledgeBaseArticlesRequest(RequestBaseModel):
    text: Optional[str] = Field(default=None, min_length=1)
    subject: Optional[str] = Field(default=None, max_length=300)
    description: Optional[str] = None
    ticket_id: Optional[UUID] = None
    limit: int = Field(default=5, ge=1, le=20)


KnowledgeBaseArticleTreeNodeResponse.model_rebuild()
