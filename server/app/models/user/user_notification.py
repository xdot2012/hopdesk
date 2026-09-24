from sqlalchemy import ForeignKey, Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class UserNotification(Base):
    __tablename__ = "user_notification"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete ="CASCADE"),
        primary_key=True,
    )
    user = relationship("User", back_populates="notifications")

    notification_id = Column(
        UUID(as_uuid=True),
        ForeignKey("notification.id", ondelete ="CASCADE"),
        primary_key=True,
    )
    notification = relationship("Notification")
    read_at = Column(DateTime(timezone=False), nullable=True)