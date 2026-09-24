from sqlalchemy import Boolean, Column, String, Text
from sqlalchemy.orm import relationship

from app.models.base import TimedBase, uuid_foreign_key


class TicketMessage(TimedBase):
    __tablename__ = "ticket_message"

    ticket_id = uuid_foreign_key("ticket.id", ondelete="CASCADE", index=True)
    author_user_id = uuid_foreign_key("user.id", index=True)
    visibility = Column(String(20), nullable=False, default="public")
    body = Column(Text, nullable=False)
    customer_pending = Column(Boolean, nullable=False, default=False)

    ticket = relationship("Ticket", back_populates="messages")
    author = relationship("User")
    attachments = relationship(
        "TicketAttachment",
        back_populates="message",
        order_by="TicketAttachment.created_at",
    )
