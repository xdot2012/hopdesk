import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.sla.policy import SlaPolicy
from app.models.sla.priority_target import SlaPriorityTarget
from app.models.ticket.ticket import Ticket
from app.core.default_business_calendar import (
    DEFAULT_TIMEZONE,
    default_business_calendars,
)
from app.core.business_time import add_business_minutes_union, business_minutes_between_union
from app.core.ticket_constants import (
    SLA_STATUS_DUE,
    SLA_STATUS_FAILED,
    SLA_STATUS_FULFILLED,
    SLA_STATUS_PAUSED,
    STATUS_CATEGORY_OPEN,
    STATUS_CATEGORY_RESOLVED,
    TICKET_STATUS_CATEGORIES,
)


def get_default_policy(db: Session) -> SlaPolicy | None:
    result = db.execute(
        select(SlaPolicy)
        .options(joinedload(SlaPolicy.priority_targets))
        .where(SlaPolicy.enabled.is_(True))
        .order_by(SlaPolicy.created_at.asc())
        .limit(1)
    )
    return result.scalars().unique().first()


def get_priority_target(
    policy: SlaPolicy,
    priority_id: UUID,
) -> SlaPriorityTarget | None:
    for target in policy.priority_targets:
        if target.priority_id == priority_id:
            return target
    return None


def _calendars_for_policy(policy: SlaPolicy | None):
    timezone_name = (
        (policy.timezone if policy else None) or DEFAULT_TIMEZONE
    )
    return default_business_calendars(timezone_name)


def apply_sla_on_create(
    ticket: Ticket,
    db: Session,
    now: datetime.datetime | None = None,
) -> None:
    now = now or datetime.datetime.now()
    policy = get_default_policy(db)
    if not policy:
        return

    target = get_priority_target(policy, ticket.priority_id)
    if not target:
        return

    calendars = _calendars_for_policy(policy)

    ticket.sla_policy_id = policy.id
    ticket.response_due_at = add_business_minutes_union(
        now, target.first_response_minutes, calendars
    )
    ticket.resolution_due_at = add_business_minutes_union(
        now, target.resolution_minutes, calendars
    )
    ticket.sla_status = SLA_STATUS_DUE
    ticket.total_hold_seconds = 0
    ticket.hold_started_at = None


def mark_first_response(ticket: Ticket, now: datetime.datetime | None = None) -> None:
    now = now or datetime.datetime.now()
    if ticket.first_responded_at:
        return

    ticket.first_responded_at = now
    if ticket.response_due_at and now > ticket.response_due_at:
        ticket.sla_status = SLA_STATUS_FAILED
    elif ticket.sla_status != SLA_STATUS_FAILED:
        ticket.sla_status = SLA_STATUS_DUE


def apply_awaiting_customer_reply_to_sla(
    ticket: Ticket,
    awaiting: bool,
    *,
    was_awaiting: bool,
    now: datetime.datetime | None = None,
    db: Session | None = None,
) -> None:
    now = now or datetime.datetime.now()

    if awaiting == was_awaiting:
        return

    if awaiting and not was_awaiting:
        ticket.hold_started_at = now
        if ticket.sla_status not in (
            SLA_STATUS_FAILED,
            SLA_STATUS_FULFILLED,
        ):
            ticket.sla_status = SLA_STATUS_PAUSED
        return

    if was_awaiting and not awaiting:
        if ticket.hold_started_at:
            hold_seconds = int((now - ticket.hold_started_at).total_seconds())
            ticket.total_hold_seconds = (ticket.total_hold_seconds or 0) + max(hold_seconds, 0)
            if ticket.resolution_due_at and db is not None:
                policy = None
                if ticket.sla_policy_id:
                    policy = db.get(
                        SlaPolicy,
                        ticket.sla_policy_id,
                    )
                if policy is None:
                    policy = get_default_policy(db)
                calendars = _calendars_for_policy(policy)
                remaining = business_minutes_between_union(
                    ticket.hold_started_at,
                    ticket.resolution_due_at,
                    calendars,
                )
                ticket.resolution_due_at = add_business_minutes_union(
                    now, max(remaining, 0), calendars
                )
            elif ticket.resolution_due_at:
                ticket.resolution_due_at = ticket.resolution_due_at + datetime.timedelta(
                    seconds=max(hold_seconds, 0)
                )
            ticket.hold_started_at = None
        if ticket.sla_status not in (
            SLA_STATUS_FAILED,
            SLA_STATUS_FULFILLED,
        ):
            ticket.sla_status = SLA_STATUS_DUE


def apply_status_change_to_sla(
    ticket: Ticket,
    old_status: str,
    new_status: str,
    now: datetime.datetime | None = None,
    db: Session | None = None,
) -> None:
    now = now or datetime.datetime.now()
    old_category = TICKET_STATUS_CATEGORIES.get(old_status, STATUS_CATEGORY_OPEN)
    new_category = TICKET_STATUS_CATEGORIES.get(new_status, STATUS_CATEGORY_OPEN)

    if old_category == new_category:
        return

    if new_category == STATUS_CATEGORY_RESOLVED:
        if ticket.hold_started_at:
            hold_seconds = int((now - ticket.hold_started_at).total_seconds())
            ticket.total_hold_seconds = (ticket.total_hold_seconds or 0) + max(hold_seconds, 0)
            ticket.hold_started_at = None
        ticket.resolved_at = now
        due = ticket.resolution_due_at
        if due and now > due:
            ticket.sla_status = SLA_STATUS_FAILED
        else:
            ticket.sla_status = SLA_STATUS_FULFILLED
