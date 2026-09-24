import datetime
from uuid import UUID

from sqlalchemy import String, and_, cast, false, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.roles import ROLE_CUSTOMER
from app.core.ticket_constants import (
    ACTIVE_TICKET_STATUSES,
    SLA_STATUS_FAILED,
    TICKET_STATUS_CANCELLED_BY_REQUESTER,
    TICKET_STATUS_CLOSED,
    TICKET_STATUS_OPEN,
    TICKET_STATUS_TESTING,
    TICKET_STATUS_TRIAGE,
)
from app.models.ticket.ticket import Ticket
from app.models.ticket.ticket_message import TicketMessage
from app.models.ticket.ticket_priority import TicketPriority
from app.use_cases.ticket.get_ticket_stats import (
    QueueFinishedPeriod,
    VALID_QUEUE_FINISHED_PERIODS,
    resolve_queue_finished_cutoff_datetime,
)
from app.use_cases.user_sector.manage_user_sectors import get_managed_user_sector


def _ticket_query():
    return (
        select(Ticket)
        .options(
            joinedload(Ticket.priority),
            joinedload(Ticket.sector),
            joinedload(Ticket.requester),
            joinedload(Ticket.assignee),
            joinedload(Ticket.messages).joinedload(TicketMessage.author),
            joinedload(Ticket.attachments),
        )
    )


FINISHED_STATUSES = (
    TICKET_STATUS_TESTING,
    TICKET_STATUS_CLOSED,
    TICKET_STATUS_CANCELLED_BY_REQUESTER,
)


DEFAULT_TICKET_PAGE_SIZE = 15


DEFAULT_FINISHED_PERIOD: QueueFinishedPeriod = "last_24_hours"


def _normalize_finished_period(
    finished_period: str | None,
    *,
    include_finished: bool = False,
    finished_only: bool = False,
) -> QueueFinishedPeriod | None:
    """Return a bounded period, or None for all finished tickets (history)."""
    if finished_period == "all":
        return None
    if finished_period in VALID_QUEUE_FINISHED_PERIODS:
        return finished_period  # type: ignore[return-value]
    if finished_only:
        return None
    if include_finished:
        return "last_3_months"
    return DEFAULT_FINISHED_PERIOD


def _ticket_finished_at():
    return func.coalesce(Ticket.resolved_at, Ticket.updated_at)


def _append_finished_period_filter(
    filters: list,
    finished_period: QueueFinishedPeriod,
    *,
    status: str | None = None,
) -> None:
    cutoff = resolve_queue_finished_cutoff_datetime(finished_period)

    if status:
        if status in FINISHED_STATUSES:
            filters.append(_ticket_finished_at() >= cutoff)
        return

    filters.append(
        or_(
            Ticket.status.not_in(FINISHED_STATUSES),
            and_(
                Ticket.status.in_(FINISHED_STATUSES),
                _ticket_finished_at() >= cutoff,
            ),
        )
    )


async def list_priorities(db: Session) -> list[TicketPriority]:
    result = db.execute(select(TicketPriority).order_by(TicketPriority.sort_order))
    return list(result.scalars().all())


async def get_default_priority(db: Session) -> TicketPriority | None:
    result = db.execute(
        select(TicketPriority).order_by(TicketPriority.sort_order).limit(1)
    )
    return result.scalars().first()


def _ticket_text_search_filter(search: str):
    term = (search or "").strip()
    if not term:
        return None

    pattern = f"%{term}%"
    conditions = [
        Ticket.subject.ilike(pattern),
        Ticket.external_id.ilike(pattern),
        cast(Ticket.number, String).ilike(pattern),
    ]
    digits = term.lstrip("#").strip()
    if digits.isdigit():
        conditions.append(Ticket.number == int(digits))
    return or_(*conditions)


def _base_ticket_filters(
    *,
    user_id: UUID,
    role_name: str,
    finished_period: QueueFinishedPeriod | None = DEFAULT_FINISHED_PERIOD,
    status: str | None = None,
    include_closed: bool | None = None,
    finished_only: bool = False,
    number: int | None = None,
    external_id: str | None = None,
    search: str | None = None,
    created_from: datetime.date | None = None,
    created_to: datetime.date | None = None,
    finished_from: datetime.date | None = None,
    finished_to: datetime.date | None = None,
    assignee_user_id: UUID | None = None,
    requester_user_id: UUID | None = None,
    sector_id: UUID | None = None,
    priority_code: str | None = None,
    unassigned: bool = False,
    sla_failed: bool = False,
    awaiting_customer: bool = False,
    scope: str | None = None,
    db: Session | None = None,
):
    filters = []
    if role_name == ROLE_CUSTOMER:
        if scope == "sector":
            membership = get_managed_user_sector(user_id, db) if db is not None else None
            if membership and membership.sector_id:
                filters.append(Ticket.sector_id == membership.sector_id)
            else:
                filters.append(false())
        else:
            filters.append(Ticket.requester_user_id == user_id)

    has_finished_date_range = finished_from is not None or finished_to is not None
    has_created_date_range = created_from is not None or created_to is not None

    if status:
        filters.append(Ticket.status == status)
        if (
            status in FINISHED_STATUSES
            and finished_period is not None
            and not has_finished_date_range
            and not has_created_date_range
        ):
            _append_finished_period_filter(filters, finished_period, status=status)
    elif finished_only:
        filters.append(Ticket.status.in_(FINISHED_STATUSES))
        if finished_period is not None and not has_finished_date_range:
            filters.append(
                _ticket_finished_at() >= resolve_queue_finished_cutoff_datetime(finished_period)
            )
    elif include_closed is False:
        filters.append(Ticket.status.not_in(FINISHED_STATUSES))
    else:
        # Creation-date windows already bound the result set; skip finished-period cutoff
        # so exports/stats-aligned lists include every ticket created in range.
        if not has_finished_date_range and not has_created_date_range:
            _append_finished_period_filter(
                filters,
                finished_period if finished_period is not None else DEFAULT_FINISHED_PERIOD,
            )

    if number is not None:
        filters.append(Ticket.number == number)

    if external_id:
        filters.append(Ticket.external_id.ilike(f"%{external_id}%"))

    search_filter = _ticket_text_search_filter(search or "")
    if search_filter is not None:
        filters.append(search_filter)

    if created_from is not None:
        filters.append(func.date(Ticket.created_at) >= created_from)

    if created_to is not None:
        filters.append(func.date(Ticket.created_at) <= created_to)

    if finished_from is not None:
        filters.append(func.date(_ticket_finished_at()) >= finished_from)

    if finished_to is not None:
        filters.append(func.date(_ticket_finished_at()) <= finished_to)

    if sector_id is not None:
        filters.append(Ticket.sector_id == sector_id)

    if unassigned:
        filters.append(Ticket.assignee_user_id.is_(None))
        if not status and not finished_only:
            filters.append(Ticket.status.in_(ACTIVE_TICKET_STATUSES))
    elif assignee_user_id is not None:
        filters.append(Ticket.assignee_user_id == assignee_user_id)

    if requester_user_id is not None:
        filters.append(Ticket.requester_user_id == requester_user_id)

    if priority_code:
        filters.append(Ticket.priority.has(TicketPriority.code == priority_code))

    if sla_failed:
        filters.append(
            Ticket.sla_status == SLA_STATUS_FAILED
        )

    if awaiting_customer:
        filters.append(Ticket.awaiting_customer_reply.is_(True))

    return filters


def _count_tickets(db: Session, filters: list) -> int:
    stmt = select(func.count()).select_from(Ticket)
    for condition in filters:
        stmt = stmt.where(condition)
    return db.execute(stmt).scalar_one()


EMPTY_QUEUE_COUNTS = {
    "all": 0,
    "triage": 0,
    "open": 0,
    "waiting_customer": 0,
    "unassigned": 0,
    "sla_failed": 0,
}


async def list_tickets(
    user_id: UUID,
    role_name: str,
    db: Session,
    *,
    status: str | None = None,
    include_finished: bool = False,
    include_closed: bool | None = None,
    finished_only: bool = False,
    finished_period: str | None = None,
    number: int | None = None,
    external_id: str | None = None,
    search: str | None = None,
    created_from: datetime.date | None = None,
    created_to: datetime.date | None = None,
    finished_from: datetime.date | None = None,
    finished_to: datetime.date | None = None,
    assignee_user_id: UUID | None = None,
    requester_user_id: UUID | None = None,
    sector_id: UUID | None = None,
    priority_code: str | None = None,
    unassigned: bool = False,
    sla_failed: bool = False,
    awaiting_customer: bool = False,
    scope: str | None = None,
    include_counts: bool = False,
    page: int = 1,
    size: int = DEFAULT_TICKET_PAGE_SIZE,
) -> dict:
    page = max(page, 1)
    size = min(max(size, 1), 100)
    ticket_scope = scope if scope in ("mine", "sector") else None
    resolved_finished_period = _normalize_finished_period(
        finished_period,
        include_finished=include_finished,
        finished_only=finished_only,
    )
    normalized_external_id = (external_id or "").strip() or None
    normalized_search = (search or "").strip() or None
    normalized_priority_code = (priority_code or "").strip() or None

    def filters_for(**kwargs):
        return _base_ticket_filters(
            user_id=user_id,
            role_name=role_name,
            db=db,
            scope=ticket_scope,
            finished_period=resolved_finished_period,
            include_closed=include_closed,
            finished_only=finished_only,
            number=number,
            external_id=normalized_external_id,
            search=normalized_search,
            created_from=created_from,
            created_to=created_to,
            finished_from=finished_from,
            finished_to=finished_to,
            assignee_user_id=assignee_user_id,
            requester_user_id=requester_user_id,
            sector_id=sector_id,
            priority_code=normalized_priority_code,
            **kwargs,
        )

    filters = filters_for(
        status=status,
        unassigned=unassigned,
        sla_failed=sla_failed,
        awaiting_customer=awaiting_customer,
    )

    total = _count_tickets(db, filters)
    pages = max((total + size - 1) // size, 1) if total else 0
    if pages and page > pages:
        page = pages

    query = _ticket_query().order_by(
        _ticket_finished_at().desc() if finished_only else Ticket.created_at.desc()
    )
    for condition in filters:
        query = query.where(condition)

    offset = (page - 1) * size
    result = db.execute(query.offset(offset).limit(size))
    items = list(result.scalars().unique().all())

    if include_counts:
        # Tab counts share the same finished/customer scope, without view-specific filters.
        scope_filters = filters_for()
        triage_filters = filters_for(status=TICKET_STATUS_TRIAGE)
        open_filters = filters_for(status=TICKET_STATUS_OPEN)
        unassigned_filters = filters_for(unassigned=True)
        sla_failed_filters = filters_for(sla_failed=True)
        awaiting_customer_filters = filters_for(awaiting_customer=True)

        counts = {
            "all": _count_tickets(db, scope_filters),
            "triage": _count_tickets(db, triage_filters),
            "open": _count_tickets(db, open_filters),
            "waiting_customer": _count_tickets(db, awaiting_customer_filters),
            "unassigned": _count_tickets(db, unassigned_filters),
            "sla_failed": _count_tickets(db, sla_failed_filters),
        }
    else:
        counts = EMPTY_QUEUE_COUNTS

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
        "counts": counts,
    }
