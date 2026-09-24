from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import UUIDBase


class Notification(UUIDBase):
    __tablename__ = "notification"

    title = Column(String(100), nullable=False)
    text = Column(String(500), nullable=False)
    link = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=False), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=False), nullable=False, server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=False), nullable=True)

    created_by = Column(UUID(as_uuid=True), nullable=True)
    updated_by = Column(UUID(as_uuid=True), nullable=True)

