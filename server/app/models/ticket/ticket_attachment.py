from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.models.base import TimedBase, uuid_foreign_key


class TicketAttachment(TimedBase):
    __tablename__ = "ticket_attachment"

    ticket_id = uuid_foreign_key("ticket.id", ondelete="CASCADE", index=True)
    message_id = uuid_foreign_key(
        "ticket_message.id",
        ondelete="CASCADE",
        nullable=True,
        index=True,
    )
    file_key = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    content_type = Column(String(200), nullable=False)
    size = Column(Integer, nullable=False, default=0)

    ticket = relationship("Ticket", back_populates="attachments")
    message = relationship("TicketMessage", back_populates="attachments")
