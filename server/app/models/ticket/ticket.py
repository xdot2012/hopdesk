from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.models.base import TimedBase, uuid_foreign_key


class Ticket(TimedBase):
    __tablename__ = "ticket"

    number = Column(Integer, unique=True, nullable=False, index=True)
    subject = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    page_url = Column(String(2000), nullable=True, default="")
    external_id = Column(String(200), nullable=True)
    cause = Column(Text, nullable=True)
    solution = Column(Text, nullable=True)
    solution_internal = Column(Boolean, nullable=False, default=False)
    status = Column(String(50), nullable=False, default="open", index=True)

    priority_id = uuid_foreign_key("ticket_priority.id", index=True)
    requester_priority_id = uuid_foreign_key(
        "ticket_priority.id",
        nullable=True,
        index=True,
        ondelete="SET NULL",
    )
    sector_id = uuid_foreign_key("sector.id", nullable=True, index=True, ondelete="SET NULL")
    requester_user_id = uuid_foreign_key("user.id", index=True)
    assignee_user_id = uuid_foreign_key("user.id", nullable=True, index=True)
    sla_policy_id = uuid_foreign_key(
        "sla_policy.id",
        nullable=True,
        index=True,
    )

    response_due_at = Column(DateTime(timezone=False), nullable=True)
    resolution_due_at = Column(DateTime(timezone=False), nullable=True)
    first_responded_at = Column(DateTime(timezone=False), nullable=True)
    resolved_at = Column(DateTime(timezone=False), nullable=True)
    effort_minutes = Column(Integer, nullable=True)
    satisfaction_rating = Column(Integer, nullable=True)
    satisfaction_comment = Column(Text, nullable=True)
    satisfaction_rated_at = Column(DateTime(timezone=False), nullable=True)
    sla_status = Column(String(50), nullable=True)
    hold_started_at = Column(DateTime(timezone=False), nullable=True)
    total_hold_seconds = Column(Integer, nullable=False, default=0)
    awaiting_customer_reply = Column(Boolean, nullable=False, default=False)

    priority = relationship(
        "TicketPriority",
        back_populates="tickets",
        foreign_keys=[priority_id],
    )
    requester_priority = relationship(
        "TicketPriority",
        foreign_keys=[requester_priority_id],
    )
    sector = relationship("Sector", back_populates="tickets")
    requester = relationship("User", foreign_keys=[requester_user_id])
    assignee = relationship("User", foreign_keys=[assignee_user_id])
    sla_policy = relationship("SlaPolicy")
    messages = relationship(
        "TicketMessage",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="TicketMessage.created_at",
    )
    attachments = relationship(
        "TicketAttachment",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="TicketAttachment.created_at",
    )
    views = relationship(
        "TicketView",
        back_populates="ticket",
        cascade="all, delete-orphan",
    )
