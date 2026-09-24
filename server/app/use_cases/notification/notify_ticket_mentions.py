from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.cache_database import invalidate_user_profile_cache
from app.core.roles import ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER
from app.models import UserNotification
from app.models.ticket.ticket import Ticket
from app.models.user.user import User
from app.use_cases.notification.create_notification import create_notification
from app.use_cases.notification.extract_mentions import extract_mentioned_user_ids
from app.use_cases.user_sector.manage_user_sectors import user_sector_can_access_ticket


def _actor_display_name(name: str | None, email: str | None) -> str:
    trimmed = (name or "").strip()
    if trimmed and "@" not in trimmed:
        return trimmed
    if email:
        return email.split("@")[0] or email
    return "Alguém"


def _user_can_receive_ticket_mention(
    user: User,
    ticket: Ticket,
    db: Session,
) -> bool:
    role_name = user.role.name if user.role else None
    if role_name in (ROLE_ADMIN, ROLE_AGENT):
        return True
    if role_name == ROLE_CUSTOMER:
        return user_sector_can_access_ticket(user.id, ticket, db)
    return False


async def notify_ticket_mentions(
    *,
    html: str | None,
    ticket: Ticket,
    actor_user_id: UUID,
    actor_name: str | None,
    actor_email: str | None,
    db: Session,
    previous_html: str | None = None,
    commit: bool = True,
) -> list[UUID]:
    """Create inbox notifications for newly mentioned users on a ticket.

    Returns the user IDs that were notified.
    """
    mentioned = set(extract_mentioned_user_ids(html))
    if previous_html is not None:
        mentioned -= set(extract_mentioned_user_ids(previous_html))
    mentioned.discard(actor_user_id)
    if not mentioned:
        return []

    users = list(
        db.execute(
            select(User)
            .options(joinedload(User.role))
            .where(User.id.in_(mentioned))
        ).scalars().unique().all()
    )

    recipient_ids: list[UUID] = []
    for user in users:
        if _user_can_receive_ticket_mention(user, ticket, db):
            recipient_ids.append(user.id)

    if not recipient_ids:
        return []

    actor_label = _actor_display_name(actor_name, actor_email)
    notification = await create_notification(
        title="Menção em chamado",
        text=f"{actor_label} mencionou você no chamado #{ticket.number}",
        link=f"/tickets/{ticket.id}",
        db=db,
        commit=False,
        created_by=actor_user_id,
    )

    for user_id in recipient_ids:
        db.add(
            UserNotification(
                user_id=user_id,
                notification_id=notification.id,
            )
        )

    if commit:
        db.commit()
        for user_id in recipient_ids:
            await invalidate_user_profile_cache(str(user_id))
    else:
        db.flush()

    return recipient_ids
