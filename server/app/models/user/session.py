from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, func


class Session(Base):
    __tablename__ = "session"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete ="CASCADE"),
        primary_key=True,
    )
    user_agent = Column(String(200), nullable=True)
    client_ip = Column(String(200), nullable=True)
    is_blocked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=False), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=False), nullable=False, server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=False), nullable=False)

