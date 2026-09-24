from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.cache_database import invalidate_user_profile_cache
from app.core.roles import ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER
from app.core.ticket_constants import (
    MESSAGE_VISIBILITY_INTERNAL,
    MESSAGE_VISIBILITY_PUBLIC,
)
from app.core.ticket_events import ACTION_MESSAGE, publish_ticket_changed
from app.models.ticket.ticket import Ticket
from app.models.ticket.ticket_attachment import TicketAttachment
from app.models.ticket.ticket_message import TicketMessage
from app.models.user.user import User
from app.services.email import EmailService
from app.services.file_management.service import FileManagementService
from app.use_cases.knowledge_base.sanitize_article_html import (
    sanitize_article_html,
    strip_html_to_text,
)
from app.use_cases.notification.notify_ticket_emails import schedule_ticket_public_message_email
from app.use_cases.notification.notify_ticket_mentions import notify_ticket_mentions
from app.use_cases.sla.apply_sla import (
    apply_awaiting_customer_reply_to_sla,
    mark_first_response,
)
from app.use_cases.ticket.build_ticket_response import _touch_ticket_updated_at
from app.use_cases.ticket.get_ticket import get_ticket
from app.use_cases.ticket.ticket_views import mark_ticket_viewed


async def create_ticket_message(
    *,
    ticket_id: UUID,
    user_id: UUID,
    role_name: str,
    body: str,
    visibility: str,
    customer_pending: bool = False,
    attachments: list[dict] | None = None,
    db: Session,
    file_service: FileManagementService | None = None,
    mail: EmailService | None = None,
    background_tasks: BackgroundTasks | None = None,
    client_base_url: str = "",
) -> tuple[Ticket | None, str | None]:
    ticket = await get_ticket(ticket_id, user_id, role_name, db)
    if not ticket:
        return None, "not_found"

    plain_body = strip_html_to_text(body or "")
    attachment_items = attachments or []

    if not plain_body and not attachment_items:
        return None, "message_empty"

    clean_body = sanitize_article_html(body) if plain_body else ""

    if visibility == MESSAGE_VISIBILITY_INTERNAL and role_name == ROLE_CUSTOMER:
        return None, "internal_not_allowed"

    if visibility not in (MESSAGE_VISIBILITY_PUBLIC, MESSAGE_VISIBILITY_INTERNAL):
        visibility = MESSAGE_VISIBILITY_PUBLIC

    if role_name == ROLE_CUSTOMER:
        visibility = MESSAGE_VISIBILITY_PUBLIC
        customer_pending = False

    if customer_pending and visibility != MESSAGE_VISIBILITY_PUBLIC:
        customer_pending = False

    if customer_pending and role_name not in (ROLE_AGENT, ROLE_ADMIN):
        customer_pending = False

    seen_keys: set[str] = set()
    normalized_attachments: list[dict] = []
    for item in attachment_items:
        file_key = (item.get("key") or "").strip()
        if not file_key or file_key in seen_keys:
            continue
        seen_keys.add(file_key)
        if not file_service or not await file_service.read(file_key):
            return None, "attachment_not_found"
        normalized_attachments.append(
            {
                "file_key": file_key,
                "original_filename": (item.get("original_filename") or file_key).strip()[:500],
                "content_type": (item.get("content_type") or "application/octet-stream").strip()[:200],
                "size": int(item.get("size") or 0),
            }
        )

    was_awaiting = ticket.awaiting_customer_reply

    message = TicketMessage(
        ticket_id=ticket.id,
        author_user_id=user_id,
        visibility=visibility,
        body=clean_body,
        customer_pending=customer_pending,
    )
    db.add(message)
    db.flush()

    for attachment in normalized_attachments:
        db.add(
            TicketAttachment(
                ticket_id=ticket.id,
                message_id=message.id,
                file_key=attachment["file_key"],
                original_filename=attachment["original_filename"],
                content_type=attachment["content_type"],
                size=attachment["size"],
            )
        )

    _touch_ticket_updated_at(ticket)

    if (
        visibility == MESSAGE_VISIBILITY_PUBLIC
        and role_name in (ROLE_AGENT, ROLE_ADMIN)
        and not ticket.first_responded_at
    ):
        mark_first_response(ticket)

    if customer_pending:
        ticket.awaiting_customer_reply = True
        apply_awaiting_customer_reply_to_sla(
            ticket,
            True,
            was_awaiting=was_awaiting,
            db=db,
        )
    elif role_name == ROLE_CUSTOMER and visibility == MESSAGE_VISIBILITY_PUBLIC:
        ticket.awaiting_customer_reply = False
        apply_awaiting_customer_reply_to_sla(
            ticket,
            False,
            was_awaiting=was_awaiting,
            db=db,
        )

    db.add(ticket)

    actor = db.execute(select(User).where(User.id == user_id)).scalars().first()
    mentioned_user_ids = await notify_ticket_mentions(
        html=clean_body,
        ticket=ticket,
        actor_user_id=user_id,
        actor_name=actor.name if actor else None,
        actor_email=actor.email if actor else None,
        db=db,
        commit=False,
    )

    db.commit()
    for mentioned_user_id in mentioned_user_ids:
        await invalidate_user_profile_cache(str(mentioned_user_id))

    publish_ticket_changed(
        ticket_id=ticket.id,
        action=ACTION_MESSAGE,
        requester_user_id=ticket.requester_user_id,
        sector_id=ticket.sector_id,
        actor_user_id=user_id,
    )
    mark_ticket_viewed(ticket_id=ticket.id, user_id=user_id, db=db)
    refreshed = await get_ticket(ticket_id, user_id, role_name, db)
    if (
        refreshed
        and visibility == MESSAGE_VISIBILITY_PUBLIC
        and mail is not None
        and background_tasks is not None
    ):
        await schedule_ticket_public_message_email(
            ticket=refreshed,
            actor=actor,
            actor_role_name=role_name,
            client_base_url=client_base_url,
            db=db,
            mail=mail,
            background_tasks=background_tasks,
        )
    return refreshed, None


def _find_ticket_message(ticket: Ticket, message_id: UUID) -> TicketMessage | None:
    for message in ticket.messages:
        if message.id == message_id:
            return message
    return None


async def update_ticket_message(
    *,
    ticket_id: UUID,
    message_id: UUID,
    user_id: UUID,
    role_name: str,
    body: str,
    db: Session,
) -> tuple[Ticket | None, str | None]:
    ticket = await get_ticket(ticket_id, user_id, role_name, db)
    if not ticket:
        return None, "not_found"

    message = _find_ticket_message(ticket, message_id)
    if not message:
        return None, "message_not_found"

    if message.author_user_id != user_id:
        return None, "forbidden"

    if len(strip_html_to_text(body or "")) < 1:
        return None, "message_empty"

    previous_body = message.body or ""
    message.body = sanitize_article_html(body)
    db.add(message)
    _touch_ticket_updated_at(ticket)
    db.add(ticket)

    actor = db.execute(select(User).where(User.id == user_id)).scalars().first()
    mentioned_user_ids = await notify_ticket_mentions(
        html=message.body,
        ticket=ticket,
        actor_user_id=user_id,
        actor_name=actor.name if actor else None,
        actor_email=actor.email if actor else None,
        db=db,
        previous_html=previous_body,
        commit=False,
    )

    db.commit()
    for mentioned_user_id in mentioned_user_ids:
        await invalidate_user_profile_cache(str(mentioned_user_id))

    publish_ticket_changed(
        ticket_id=ticket.id,
        action=ACTION_MESSAGE,
        requester_user_id=ticket.requester_user_id,
        sector_id=ticket.sector_id,
        actor_user_id=user_id,
    )
    mark_ticket_viewed(ticket_id=ticket.id, user_id=user_id, db=db)
    return await get_ticket(ticket_id, user_id, role_name, db), None


async def delete_ticket_message(
    *,
    ticket_id: UUID,
    message_id: UUID,
    user_id: UUID,
    role_name: str,
    db: Session,
) -> tuple[Ticket | None, str | None]:
    ticket = await get_ticket(ticket_id, user_id, role_name, db)
    if not ticket:
        return None, "not_found"

    message = _find_ticket_message(ticket, message_id)
    if not message:
        return None, "message_not_found"

    if message.author_user_id != user_id:
        return None, "forbidden"

    db.delete(message)
    _touch_ticket_updated_at(ticket)
    db.add(ticket)
    db.commit()
    publish_ticket_changed(
        ticket_id=ticket.id,
        action=ACTION_MESSAGE,
        requester_user_id=ticket.requester_user_id,
        sector_id=ticket.sector_id,
        actor_user_id=user_id,
    )
    mark_ticket_viewed(ticket_id=ticket.id, user_id=user_id, db=db)
    return await get_ticket(ticket_id, user_id, role_name, db), None
