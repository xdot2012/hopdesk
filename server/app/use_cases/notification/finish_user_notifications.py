import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.cache_database import invalidate_user_profile_cache
from app.models import UserNotification


async def finish_user_notifications(
    user_id: UUID | str,
    notification_ids: list[UUID | str],
    db: Session,
) -> list[UserNotification]:
    if not notification_ids:
        return []

    rows = list(
        db.execute(
            select(UserNotification).where(
                UserNotification.user_id == user_id,
                UserNotification.notification_id.in_(notification_ids),
            )
        ).scalars().all()
    )

    now = datetime.datetime.now()
    for row in rows:
        if row.read_at is None:
            row.read_at = now
            db.add(row)

    db.commit()
    await invalidate_user_profile_cache(str(user_id))
    return rows
