from sqlalchemy import JSON, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.ticket_constants import KNOWLEDGE_BASE_VISIBILITY_PUBLIC
from app.models.base import TimedBase, uuid_foreign_key


class KnowledgeBaseArticle(TimedBase):
    __tablename__ = "knowledge_base_article"

    parent_id = uuid_foreign_key(
        "knowledge_base_article.id",
        ondelete="SET NULL",
        nullable=True,
        index=True,
    )
    root_id = uuid_foreign_key(
        "knowledge_base_article.id",
        ondelete="SET NULL",
        nullable=True,
        index=True,
    )
    title = Column(String(300), nullable=False)
    slug = Column(String(300), unique=True, nullable=False)
    body = Column(Text, nullable=False)
    keywords = Column(JSON, nullable=False, default=list)
    status = Column(String(20), nullable=False, default="draft", index=True)
    author_id = uuid_foreign_key("user.id", index=True)
    published_at = Column(DateTime(timezone=False), nullable=True)
    view_count = Column(Integer, nullable=False, default=0)
    sort_order = Column(Integer, nullable=False, default=0)
    visibility = Column(String(20), nullable=True, default=KNOWLEDGE_BASE_VISIBILITY_PUBLIC)

    author = relationship("User")
    parent = relationship(
        "KnowledgeBaseArticle",
        remote_side="KnowledgeBaseArticle.id",
        back_populates="children",
        foreign_keys=[parent_id],
    )
    children = relationship(
        "KnowledgeBaseArticle",
        back_populates="parent",
        foreign_keys=[parent_id],
        order_by="KnowledgeBaseArticle.sort_order",
    )
    root = relationship(
        "KnowledgeBaseArticle",
        remote_side="KnowledgeBaseArticle.id",
        foreign_keys=[root_id],
    )
