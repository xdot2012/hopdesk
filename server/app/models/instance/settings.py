from sqlalchemy import Boolean, Column, String

from app.models.base import TimedBase


class InstanceSettings(TimedBase):
    """Singleton workspace settings for the helpdesk instance."""

    __tablename__ = "instance_settings"

    timezone = Column(String(64), nullable=False, default="America/Sao_Paulo")
    ticket_email_on_created = Column(Boolean, nullable=False, default=False)
    ticket_email_on_public_message = Column(Boolean, nullable=False, default=False)
    ticket_email_on_status_change = Column(Boolean, nullable=False, default=False)
    ticket_email_on_assignment = Column(Boolean, nullable=False, default=False)
