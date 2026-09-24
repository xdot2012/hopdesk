from sqlalchemy import Column, DateTime, func
from sqlalchemy.orm import relationship

from app.models.base import Base, uuid_foreign_key


class TicketView(Base):
    __tablename__ = "ticket_view"

    ticket_id = uuid_foreign_key("ticket.id", ondelete="CASCADE", primary_key=True)
    user_id = uuid_foreign_key("user.id", ondelete="CASCADE", primary_key=True)
    last_viewed_at = Column(
        DateTime(timezone=False),
        nullable=False,
        server_default=func.now(),
    )

    ticket = relationship("Ticket", back_populates="views")
    user = relationship("User")
