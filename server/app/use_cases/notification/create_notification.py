from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Notification


async def create_notification(
    title: str,
    text: str,
    link: str | None,
    db: Session,
    *,
    commit: bool = True,
    created_by: UUID | None = None,
) -> Notification:
    notification = Notification(
        title=title[:100],
        text=text[:500],
        link=(link[:200] if link else None),
        created_by=created_by,
    )
    db.add(notification)
    if commit:
        db.commit()
    else:
        db.flush()
    return notification
