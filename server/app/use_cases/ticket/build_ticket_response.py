import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.ticket_constants import (
    ASSIGNEE_CHANGE_MESSAGE_PREFIX,
    MESSAGE_VISIBILITY_INTERNAL,
    MESSAGE_VISIBILITY_PUBLIC,
    STATUS_CHANGE_MESSAGE_PREFIX,
    TICKET_OPENED_MESSAGE_PREFIX,
)
from app.models.ticket.ticket import Ticket
from app.services.file_management.service import FileManagementService
from app.use_cases.knowledge_base.sanitize_article_html import strip_html_to_text
from app.use_cases.user.build_user_response import build_user_avatar_url


def _has_unread_update(
    ticket: Ticket,
    last_viewed_at: datetime.datetime | None,
) -> bool:
    if last_viewed_at is None:
        return True
    return ticket.updated_at > last_viewed_at


def _touch_ticket_updated_at(ticket: Ticket) -> None:
    ticket.updated_at = datetime.datetime.now()


def _build_status_change_message_body(old_status: str, new_status: str) -> str:
    return f"{STATUS_CHANGE_MESSAGE_PREFIX}{old_status}:{new_status}"


def _build_ticket_opened_message_body() -> str:
    return TICKET_OPENED_MESSAGE_PREFIX


def _build_assignee_change_message_body(assignee_user_id: UUID, assignee_name: str) -> str:
    return f"{ASSIGNEE_CHANGE_MESSAGE_PREFIX}{assignee_user_id}:{assignee_name}"


def build_ticket_list_item(
    ticket: Ticket,
    file_service: FileManagementService,
    *,
    db: Session | None = None,
    include_assignee: bool = True,
    last_viewed_at: datetime.datetime | None = None,
) -> dict:
    assignee_user_id = None
    assignee_name = None
    assignee_email = None
    assignee_avatar_url = None

    if include_assignee:
        assignee_user_id = ticket.assignee_user_id
        assignee_name = ticket.assignee.name if ticket.assignee else None
        assignee_email = ticket.assignee.email if ticket.assignee else None
        assignee_avatar_url = (
            build_user_avatar_url(ticket.assignee, file_service) if ticket.assignee else None
        )

    return {
        "id": ticket.id,
        "number": ticket.number,
        "subject": ticket.subject,
        "description": ticket.description or "",
        "page_url": ticket.page_url or "",
        "external_id": ticket.external_id,
        "status": ticket.status,
        "priority_id": ticket.priority_id,
        "priority_code": ticket.priority.code if ticket.priority else None,
        "priority_label": ticket.priority.label if ticket.priority else None,
        "sector_id": ticket.sector_id,
        "sector_name": ticket.sector.name if ticket.sector else None,
        "sector_color": ticket.sector.color if ticket.sector else None,
        "requester_user_id": ticket.requester_user_id,
        "requester_name": ticket.requester.name if ticket.requester else None,
        "requester_email": ticket.requester.email if ticket.requester else None,
        "requester_avatar_url": (
            build_user_avatar_url(ticket.requester, file_service) if ticket.requester else None
        ),
        "assignee_user_id": assignee_user_id,
        "assignee_name": assignee_name,
        "assignee_email": assignee_email,
        "assignee_avatar_url": assignee_avatar_url,
        "response_due_at": ticket.response_due_at,
        "resolution_due_at": ticket.resolution_due_at,
        "first_responded_at": ticket.first_responded_at,
        "sla_status": ticket.sla_status,
        "total_hold_seconds": ticket.total_hold_seconds or 0,
        "hold_started_at": ticket.hold_started_at,
        "resolved_at": ticket.resolved_at,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "awaiting_customer_reply": ticket.awaiting_customer_reply,
        "attachment_count": len(ticket.attachments or []),
        "has_unread_update": _has_unread_update(ticket, last_viewed_at),
    }


def build_ticket_response(
    ticket: Ticket,
    include_internal: bool,
    file_service: FileManagementService,
    *,
    db: Session | None = None,
    include_assignee: bool = True,
) -> dict:
    description = (ticket.description or "").strip()
    plain_description = strip_html_to_text(description)
    ticket_level_attachments = []
    attachments_by_message: dict = {}
    for attachment in ticket.attachments or []:
        item = {
            "id": attachment.id,
            "file_key": attachment.file_key,
            "original_filename": attachment.original_filename,
            "content_type": attachment.content_type,
            "size": attachment.size,
            "url": file_service.get_public_url(attachment.file_key),
        }
        if attachment.message_id:
            attachments_by_message.setdefault(attachment.message_id, []).append(item)
        else:
            ticket_level_attachments.append(item)

    messages = []
    skipped_description_echo = False
    for message in ticket.messages:
        if message.visibility == MESSAGE_VISIBILITY_INTERNAL and not include_internal:
            continue
        body = (message.body or "").strip()
        plain_body = strip_html_to_text(body)
        # Legacy: create_ticket used to mirror description as the first public message.
        if (
            not skipped_description_echo
            and message.visibility == MESSAGE_VISIBILITY_PUBLIC
            and message.author_user_id == ticket.requester_user_id
            and (body == description or plain_body == plain_description)
        ):
            skipped_description_echo = True
            continue
        messages.append(
            {
                "id": message.id,
                "ticket_id": message.ticket_id,
                "author_user_id": message.author_user_id,
                "author_name": message.author.name if message.author else None,
                "author_avatar_url": (
                    build_user_avatar_url(message.author, file_service) if message.author else None
                ),
                "visibility": message.visibility,
                "body": message.body,
                "customer_pending": message.customer_pending,
                "created_at": message.created_at,
                "updated_at": message.updated_at,
                "attachments": attachments_by_message.get(message.id, []),
            }
        )

    return {
        **build_ticket_list_item(
            ticket, file_service, db=db, include_assignee=include_assignee
        ),
        "description": ticket.description,
        "cause": ticket.cause,
        "solution": (
            None
            if (ticket.solution_internal and not include_internal)
            else ticket.solution
        ),
        "solution_internal": ticket.solution_internal,
        "effort_minutes": ticket.effort_minutes,
        "satisfaction_rating": ticket.satisfaction_rating,
        "satisfaction_comment": ticket.satisfaction_comment,
        "satisfaction_rated_at": ticket.satisfaction_rated_at,
        "first_responded_at": ticket.first_responded_at,
        "resolved_at": ticket.resolved_at,
        "updated_at": ticket.updated_at,
        "messages": messages,
        "attachments": ticket_level_attachments,
    }
