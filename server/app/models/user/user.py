from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import TimedBase
from sqlalchemy import Column, String, Boolean, ForeignKey


class User(TimedBase):
    __tablename__ = "user"

    email = Column(String(50), index=True, unique=True, nullable=False)
    name = Column(String(100), nullable=True)
    avatar_key = Column(String(500), nullable=True)
    locale = Column(String(10), nullable=False, server_default="pt-BR")
    email_confirmed = Column(Boolean, default=False)
    password = Column(String(200), nullable=False)
    role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("role.id", ondelete ="SET DEFAULT"),
        nullable=True,
        default=None,
    )
    role = relationship("Role", back_populates="users")

    notifications = relationship("UserNotification", back_populates="user")
