from sqlalchemy import Column, Integer
from sqlalchemy.orm import relationship

from app.models.base import TimedBase, uuid_foreign_key


class SlaPriorityTarget(TimedBase):
    """SLA (Service Level Agreement) target minutes per priority."""

    __tablename__ = "sla_priority_target"

    policy_id = uuid_foreign_key(
        "sla_policy.id",
        ondelete="CASCADE",
        index=True,
    )
    priority_id = uuid_foreign_key("ticket_priority.id", index=True)
    first_response_minutes = Column(Integer, nullable=False)
    resolution_minutes = Column(Integer, nullable=False)

    policy = relationship("SlaPolicy", back_populates="priority_targets")
    priority = relationship("TicketPriority", back_populates="sla_targets")
