from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.cache_database import invalidate_user_profile_cache
from app.core.roles import ROLE_CUSTOMER
from app.core.ticket_constants import (
    MESSAGE_VISIBILITY_PUBLIC,
    TICKET_STATUS_OPEN,
)
from app.core.ticket_events import ACTION_CREATED, publish_ticket_changed
from app.models.sector.sector import Sector
from app.models.ticket.ticket import Ticket
from app.models.ticket.ticket_attachment import TicketAttachment
from app.models.ticket.ticket_message import TicketMessage
from app.models.ticket.ticket_priority import TicketPriority
from app.models.user.user import User
from app.services.email import EmailService
from app.services.file_management.service import FileManagementService
from app.use_cases.knowledge_base.sanitize_article_html import (
    sanitize_article_html,
    strip_html_to_text,
)
from app.use_cases.notification.notify_ticket_emails import schedule_ticket_created_email
from app.use_cases.notification.notify_ticket_mentions import notify_ticket_mentions
from app.use_cases.sla.apply_sla import (
    apply_sla_on_create,
    get_default_policy,
)
from app.use_cases.ticket.build_ticket_response import _build_ticket_opened_message_body
from app.use_cases.ticket.get_ticket import get_ticket
from app.use_cases.ticket.list_tickets import get_default_priority
from app.use_cases.ticket.ticket_views import mark_ticket_viewed
from app.use_cases.user_sector.manage_user_sectors import get_user_sector


async def create_ticket(
    *,
    subject: str,
    description: str,
    attachments: list[dict],
    requester_user_id: UUID,
    role_name: str,
    db: Session,
    file_service: FileManagementService,
    priority_id: UUID | None = None,
    sector_id: UUID | None = None,
    external_id: str | None = None,
    page_url: str = "",
    mail: EmailService | None = None,
    background_tasks: BackgroundTasks | None = None,
    client_base_url: str = "",
) -> tuple[Ticket | None, str | None]:
    if role_name != ROLE_CUSTOMER:
        return None, "forbidden"

    if len(strip_html_to_text(description)) < 3:
        return None, "description_invalid"

    clean_description = sanitize_article_html(description)

    seen_keys: set[str] = set()
    normalized_attachments: list[dict] = []
    for item in attachments or []:
        file_key = (item.get("key") or "").strip()
        if not file_key or file_key in seen_keys:
            continue
        seen_keys.add(file_key)
        if not await file_service.read(file_key):
            return None, "attachment_not_found"
        normalized_attachments.append(
            {
                "file_key": file_key,
                "original_filename": (item.get("original_filename") or file_key).strip()[:500],
                "content_type": (item.get("content_type") or "application/octet-stream").strip()[:200],
                "size": int(item.get("size") or 0),
            }
        )

    membership = get_user_sector(requester_user_id, db)
    resolved_sector_id = sector_id
    if resolved_sector_id is None and membership is not None:
        resolved_sector_id = membership.sector_id

    if resolved_sector_id is not None:
        sector = db.execute(
            select(Sector).where(Sector.id == resolved_sector_id)
        ).scalars().first()
        if not sector:
            return None, "sector_not_found"

    if not get_default_policy(db):
        return None, "sla_not_found"

    if priority_id:
        priority = db.execute(
            select(TicketPriority).where(TicketPriority.id == priority_id)
        ).scalars().first()
        if not priority:
            return None, "invalid_priority"
    else:
        priority = await get_default_priority(db)
        if not priority:
            return None, "invalid_priority"
        priority_id = priority.id

    next_number = db.execute(select(func.coalesce(func.max(Ticket.number), 0) + 1)).scalar_one()
    normalized_external_id = (external_id or "").strip()[:200] or None

    ticket = Ticket(
        number=next_number,
        subject=subject.strip(),
        description=clean_description,
        page_url=(page_url or "").strip(),
        external_id=normalized_external_id,
        status=TICKET_STATUS_OPEN,
        priority_id=priority_id,
        requester_priority_id=priority_id,
        sector_id=resolved_sector_id,
        requester_user_id=requester_user_id,
    )
    apply_sla_on_create(ticket, db)
    db.add(ticket)
    db.flush()

    for attachment in normalized_attachments:
        db.add(
            TicketAttachment(
                ticket_id=ticket.id,
                file_key=attachment["file_key"],
                original_filename=attachment["original_filename"],
                content_type=attachment["content_type"],
                size=attachment["size"],
            )
        )

    db.add(
        TicketMessage(
            ticket_id=ticket.id,
            author_user_id=requester_user_id,
            visibility=MESSAGE_VISIBILITY_PUBLIC,
            body=_build_ticket_opened_message_body(),
        )
    )

    actor = db.execute(select(User).where(User.id == requester_user_id)).scalars().first()
    mentioned_user_ids = await notify_ticket_mentions(
        html=clean_description,
        ticket=ticket,
        actor_user_id=requester_user_id,
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
        action=ACTION_CREATED,
        requester_user_id=requester_user_id,
        sector_id=ticket.sector_id,
        actor_user_id=requester_user_id,
        number=ticket.number,
        subject=ticket.subject,
        priority_code=priority.code if priority else None,
    )
    mark_ticket_viewed(ticket_id=ticket.id, user_id=requester_user_id, db=db)

    created = await get_ticket(ticket.id, requester_user_id, role_name, db)
    if created and mail is not None and background_tasks is not None:
        await schedule_ticket_created_email(
            ticket=created,
            actor=actor,
            client_base_url=client_base_url,
            db=db,
            mail=mail,
            background_tasks=background_tasks,
        )
    return created, None
