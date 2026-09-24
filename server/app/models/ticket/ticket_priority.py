from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.models.base import TimedBase


class TicketPriority(TimedBase):
    __tablename__ = "ticket_priority"

    code = Column(String(50), unique=True, nullable=False)
    label = Column(String(100), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)

    tickets = relationship(
        "Ticket",
        back_populates="priority",
        foreign_keys="Ticket.priority_id",
    )
    sla_targets = relationship(
        "SlaPriorityTarget",
        back_populates="priority",
    )
