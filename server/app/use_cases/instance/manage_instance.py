from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.timezone import DEFAULT_TIMEZONE, normalize_timezone
from app.models.instance.settings import InstanceSettings

__all__ = [
    "DEFAULT_TIMEZONE",
    "get_or_create_instance_settings",
    "get_instance_timezone",
    "update_instance_settings",
    "update_instance_timezone",
    "build_instance_response",
]


def get_or_create_instance_settings(db: Session) -> InstanceSettings:
    settings = db.execute(select(InstanceSettings).limit(1)).scalars().first()
    if settings:
        return settings

    settings = InstanceSettings(timezone=DEFAULT_TIMEZONE)
    db.add(settings)
    db.flush()
    return settings


def get_instance_timezone(db: Session) -> str:
    settings = get_or_create_instance_settings(db)
    return settings.timezone or DEFAULT_TIMEZONE


def update_instance_settings(
    timezone: str,
    db: Session,
    *,
    ticket_email_on_created: bool | None = None,
    ticket_email_on_public_message: bool | None = None,
    ticket_email_on_status_change: bool | None = None,
    ticket_email_on_assignment: bool | None = None,
) -> tuple[InstanceSettings | None, str | None]:
    cleaned = normalize_timezone(timezone)
    if cleaned is None:
        return None, "invalid_timezone"

    settings = get_or_create_instance_settings(db)
    settings.timezone = cleaned
    if ticket_email_on_created is not None:
        settings.ticket_email_on_created = bool(ticket_email_on_created)
    if ticket_email_on_public_message is not None:
        settings.ticket_email_on_public_message = bool(ticket_email_on_public_message)
    if ticket_email_on_status_change is not None:
        settings.ticket_email_on_status_change = bool(ticket_email_on_status_change)
    if ticket_email_on_assignment is not None:
        settings.ticket_email_on_assignment = bool(ticket_email_on_assignment)
    db.commit()
    db.refresh(settings)
    return settings, None


def update_instance_timezone(
    timezone: str,
    db: Session,
) -> tuple[InstanceSettings | None, str | None]:
    """Backward-compatible wrapper used by callers that only update timezone."""
    return update_instance_settings(timezone, db)


def build_instance_response(settings: InstanceSettings) -> dict:
    return {
        "id": settings.id,
        "timezone": settings.timezone or DEFAULT_TIMEZONE,
        "ticket_email_on_created": bool(settings.ticket_email_on_created),
        "ticket_email_on_public_message": bool(settings.ticket_email_on_public_message),
        "ticket_email_on_status_change": bool(settings.ticket_email_on_status_change),
        "ticket_email_on_assignment": bool(settings.ticket_email_on_assignment),
    }
