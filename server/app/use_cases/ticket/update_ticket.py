from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.roles import AGENT_ROLES, ROLE_CUSTOMER
from app.core.ticket_constants import (
    MESSAGE_VISIBILITY_INTERNAL,
    MESSAGE_VISIBILITY_PUBLIC,
    TICKET_STATUSES,
    TICKET_STATUS_CANCELLED_BY_REQUESTER,
    TICKET_STATUS_CLOSED,
    is_valid_status_transition,
    normalize_ticket_status,
)
from app.core.ticket_events import ACTION_UPDATED, publish_ticket_changed
from app.models.ticket.ticket import Ticket
from app.models.ticket.ticket_message import TicketMessage
from app.models.ticket.ticket_priority import TicketPriority
from app.models.user.user import User
from app.services.email import EmailService
from app.use_cases.notification.notify_ticket_emails import (
    schedule_ticket_assignment_email,
    schedule_ticket_status_email,
)
from app.use_cases.sla.apply_sla import (
    apply_status_change_to_sla,
)
from app.use_cases.ticket.build_ticket_response import (
    _build_assignee_change_message_body,
    _build_status_change_message_body,
    _touch_ticket_updated_at,
)
from app.use_cases.ticket.get_ticket import get_ticket
from app.use_cases.ticket.list_tickets import FINISHED_STATUSES
from app.use_cases.ticket.ticket_views import mark_ticket_viewed


async def update_ticket(
    *,
    ticket_id: UUID,
    user_id: UUID,
    role_name: str,
    db: Session,
    status: str | None = None,
    priority_id: UUID | None = None,
    assignee_user_id: UUID | None = None,
    cause: str | None = None,
    solution: str | None = None,
    solution_internal: bool | None = None,
    effort_minutes: int | None = None,
    mail: EmailService | None = None,
    background_tasks: BackgroundTasks | None = None,
    client_base_url: str = "",
) -> tuple[Ticket | None, str | None]:
    if role_name == ROLE_CUSTOMER:
        return None, "forbidden"

    ticket = await get_ticket(ticket_id, user_id, role_name, db)
    if not ticket:
        return None, "not_found"

    status_changed_from: str | None = None
    status_changed_to: str | None = None
    assignment_changed = False

    if status is not None:
        normalized_status = normalize_ticket_status(status)
        if normalized_status not in TICKET_STATUSES:
            return None, "invalid_status"
        old_status = normalize_ticket_status(ticket.status)
        if old_status != normalized_status:
            if not is_valid_status_transition(old_status, normalized_status):
                return None, "invalid_transition"

            if normalized_status == TICKET_STATUS_CLOSED:
                normalized_cause = (cause or ticket.cause or "").strip()
                normalized_solution = (solution or ticket.solution or "").strip()
                if not normalized_cause or not normalized_solution:
                    return None, "close_details_required"
                resolved_effort = (
                    effort_minutes
                    if effort_minutes is not None
                    else ticket.effort_minutes
                )
                if resolved_effort is None:
                    return None, "effort_minutes_required"
                if resolved_effort < 1 or resolved_effort > 24 * 60:
                    return None, "invalid_effort_minutes"
                ticket.cause = normalized_cause
                ticket.solution = normalized_solution
                ticket.effort_minutes = int(resolved_effort)
                if solution_internal is not None:
                    ticket.solution_internal = bool(solution_internal)

            ticket.status = normalized_status
            apply_status_change_to_sla(
                ticket, old_status, normalized_status, db=db
            )
            db.add(
                TicketMessage(
                    ticket_id=ticket.id,
                    author_user_id=user_id,
                    visibility=MESSAGE_VISIBILITY_INTERNAL,
                    body=_build_status_change_message_body(old_status, normalized_status),
                )
            )
            _touch_ticket_updated_at(ticket)
            status_changed_from = old_status
            status_changed_to = normalized_status

    elif cause is not None or solution is not None or solution_internal is not None:
        if cause is not None:
            ticket.cause = cause.strip() or None
        if solution is not None:
            ticket.solution = solution.strip() or None
        if solution_internal is not None:
            ticket.solution_internal = bool(solution_internal)
        _touch_ticket_updated_at(ticket)

    if priority_id is not None:
        priority = db.execute(
            select(TicketPriority).where(TicketPriority.id == priority_id)
        ).scalars().first()
        if not priority:
            return None, "invalid_priority"
        ticket.priority_id = priority_id

    if assignee_user_id is not None:
        assignee = db.execute(
            select(User)
            .options(joinedload(User.role))
            .where(User.id == assignee_user_id)
        ).scalars().first()
        if not assignee:
            return None, "not_found"
        role_name_of_assignee = assignee.role.name if assignee.role else None
        if role_name_of_assignee not in AGENT_ROLES:
            return None, "invalid_assignee"
        if ticket.assignee_user_id != assignee_user_id:
            ticket.assignee_user_id = assignee_user_id
            db.add(
                TicketMessage(
                    ticket_id=ticket.id,
                    author_user_id=user_id,
                    visibility=MESSAGE_VISIBILITY_INTERNAL,
                    body=_build_assignee_change_message_body(assignee.id, assignee.name or assignee.email),
                )
            )
            _touch_ticket_updated_at(ticket)
            assignment_changed = True

    db.add(ticket)
    db.commit()
    publish_ticket_changed(
        ticket_id=ticket.id,
        action=ACTION_UPDATED,
        requester_user_id=ticket.requester_user_id,
        sector_id=ticket.sector_id,
        actor_user_id=user_id,
    )
    mark_ticket_viewed(ticket_id=ticket.id, user_id=user_id, db=db)
    updated = await get_ticket(ticket_id, user_id, role_name, db)
    if updated and mail is not None and background_tasks is not None:
        actor = db.execute(select(User).where(User.id == user_id)).scalars().first()
        if status_changed_from is not None and status_changed_to is not None:
            await schedule_ticket_status_email(
                ticket=updated,
                actor=actor,
                old_status=status_changed_from,
                new_status=status_changed_to,
                client_base_url=client_base_url,
                db=db,
                mail=mail,
                background_tasks=background_tasks,
            )
        if assignment_changed:
            await schedule_ticket_assignment_email(
                ticket=updated,
                actor=actor,
                client_base_url=client_base_url,
                db=db,
                mail=mail,
                background_tasks=background_tasks,
            )
    return updated, None


async def cancel_ticket_by_requester(
    *,
    ticket_id: UUID,
    user_id: UUID,
    role_name: str,
    db: Session,
    mail: EmailService | None = None,
    background_tasks: BackgroundTasks | None = None,
    client_base_url: str = "",
) -> tuple[Ticket | None, str | None]:
    """Requester or sector manager cancels an open ticket they can access."""
    if role_name != ROLE_CUSTOMER:
        return None, "forbidden"

    ticket = await get_ticket(ticket_id, user_id, role_name, db)
    if not ticket:
        return None, "not_found"

    old_status = normalize_ticket_status(ticket.status)
    if old_status in FINISHED_STATUSES:
        return None, "invalid_transition"

    new_status = TICKET_STATUS_CANCELLED_BY_REQUESTER
    ticket.status = new_status
    ticket.awaiting_customer_reply = False
    apply_status_change_to_sla(ticket, old_status, new_status, db=db)
    db.add(
        TicketMessage(
            ticket_id=ticket.id,
            author_user_id=user_id,
            visibility=MESSAGE_VISIBILITY_PUBLIC,
            body=_build_status_change_message_body(old_status, new_status),
        )
    )
    _touch_ticket_updated_at(ticket)
    db.add(ticket)
    db.commit()
    publish_ticket_changed(
        ticket_id=ticket.id,
        action=ACTION_UPDATED,
        requester_user_id=ticket.requester_user_id,
        sector_id=ticket.sector_id,
        actor_user_id=user_id,
    )
    mark_ticket_viewed(ticket_id=ticket.id, user_id=user_id, db=db)
    cancelled = await get_ticket(ticket_id, user_id, role_name, db)
    if cancelled and mail is not None and background_tasks is not None:
        actor = db.execute(select(User).where(User.id == user_id)).scalars().first()
        await schedule_ticket_status_email(
            ticket=cancelled,
            actor=actor,
            old_status=old_status,
            new_status=new_status,
            client_base_url=client_base_url,
            db=db,
            mail=mail,
            background_tasks=background_tasks,
        )
    return cancelled, None
