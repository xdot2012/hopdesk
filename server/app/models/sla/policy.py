from sqlalchemy import Boolean, Column, String
from sqlalchemy.orm import relationship

from app.models.base import TimedBase


class SlaPolicy(TimedBase):
    """SLA (Service Level Agreement) policy."""

    __tablename__ = "sla_policy"

    name = Column(String(200), nullable=False)
    is_default = Column(Boolean, nullable=False, default=False)
    enabled = Column(Boolean, nullable=False, default=True)
    timezone = Column(String(64), nullable=False, default="America/Sao_Paulo")

    priority_targets = relationship(
        "SlaPriorityTarget",
        back_populates="policy",
        cascade="all, delete-orphan",
    )
