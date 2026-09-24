from datetime import date, datetime, timedelta
from typing import Literal
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session
from sqlalchemy.sql import ColumnElement

from app.core.ticket_constants import (
    ACTIVE_TICKET_STATUSES,
    SLA_CHART_DUE_FIRST_RESPONSE,
    SLA_CHART_DUE_RESOLUTION,
    SLA_STATUS_DUE,
    SLA_STATUS_FAILED,
    SLA_STATUS_FULFILLED,
    SLA_STATUS_PAUSED,
    TICKET_STATUSES,
)
from app.models.sector.sector import Sector
from app.models.ticket.ticket import Ticket
from app.models.ticket.ticket_priority import TicketPriority
from app.models.user.user import User
from app.use_cases.ticket.stats_sla import _build_sla_series_and_groups
from app.use_cases.ticket.ticket_stats_common import (
    NO_SECTOR_KEY,
    StatsPeriod,
    StatsWindow,
    UNASSIGNED_KEY,
    _apply_filters,
    _period_key_from_day,
    _start_of_day,
    timestamp_window_filters,
)


SLA_STATUSES = (
    SLA_CHART_DUE_FIRST_RESPONSE,
    SLA_CHART_DUE_RESOLUTION,
    SLA_STATUS_PAUSED,
    SLA_STATUS_FULFILLED,
    SLA_STATUS_FAILED,
)


AGING_BUCKETS = ("lt_1d", "d1_3", "d3_7", "gt_7d")


MAX_STATS_PERIOD_DAYS = 90


QueueFinishedPeriod = Literal[
    "last_24_hours",
    "last_15_days",
    "last_30_days",
    "last_3_months",
]


VALID_PERIODS: tuple[StatsPeriod, ...] = (
    "last_15_days",
    "last_30_days",
    "custom",
)


VALID_QUEUE_FINISHED_PERIODS: tuple[QueueFinishedPeriod, ...] = (
    "last_24_hours",
    "last_15_days",
    "last_30_days",
    "last_3_months",
)


def _count_map(rows: list[tuple[str | None, int]]) -> dict[str, int]:
    return {str(key): count for key, count in rows if key is not None}


def resolve_queue_finished_period_start(
    period: QueueFinishedPeriod,
    today: date | None = None,
) -> date:
    today = today or date.today()
    if period == "last_24_hours":
        return today
    if period == "last_15_days":
        return today - timedelta(days=14)
    if period == "last_30_days":
        return today - timedelta(days=29)
    return today - timedelta(days=89)


def resolve_queue_finished_cutoff_datetime(
    period: QueueFinishedPeriod,
    today: date | None = None,
    *,
    now: datetime | None = None,
) -> datetime:
    if period == "last_24_hours":
        return (now or datetime.now()) - timedelta(hours=24)
    return _start_of_day(resolve_queue_finished_period_start(period, today))


def resolve_stats_window(
    period: str,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    today: date | None = None,
) -> tuple[StatsWindow | None, str | None]:
    """Validate period and return an inclusive date window, or an error message."""
    today = today or date.today()

    if period not in VALID_PERIODS:
        return None, "Período inválido."

    resolved_period: StatsPeriod = period  # type: ignore[assignment]

    if resolved_period == "custom":
        if date_from is None or date_to is None:
            return None, "Informe as datas inicial e final do período."
        start = date_from
        end = date_to
    elif resolved_period == "last_15_days":
        start = today - timedelta(days=14)
        end = today
    else:
        start = today - timedelta(days=29)
        end = today

    if start > end:
        return None, "A data inicial deve ser anterior ou igual à data final."
    if end > today:
        return None, "A data final não pode ser no futuro."
    if (end - start).days + 1 > MAX_STATS_PERIOD_DAYS:
        return None, f"O período máximo é de {MAX_STATS_PERIOD_DAYS} dias."

    return {
        "period": resolved_period,
        "date_from": start,
        "date_to": end,
    }, None


def created_at_window_filters(window: StatsWindow) -> list[ColumnElement[bool]]:
    return timestamp_window_filters(Ticket.created_at, window)


def sector_id_filters(sector_id: UUID | None) -> list[ColumnElement[bool]]:
    if sector_id is None:
        return []
    return [Ticket.sector_id == sector_id]


def _build_daily_series(
    start: date,
    end: date,
    created_map: dict[str, int],
    priority_map: dict[str, dict[str, int]],
    priority_codes: list[str],
    sector_map: dict[str, dict[str, int]],
    sector_defs: list[dict],
) -> list[dict]:
    series = []
    day = start
    while day <= end:
        key = day.isoformat()
        by_priority_counts = priority_map.get(key, {})
        by_sector_counts = sector_map.get(key, {})
        series.append(
            {
                "date": key,
                "count": created_map.get(key, 0),
                "by_priority": [
                    {"key": code, "count": by_priority_counts.get(code, 0)}
                    for code in priority_codes
                ],
                "by_sector": [
                    {
                        "key": sector["key"],
                        "label": sector["label"],
                        "count": by_sector_counts.get(sector["key"], 0),
                        "color": sector.get("color"),
                    }
                    for sector in sector_defs
                ],
            }
        )
        day += timedelta(days=1)
    return series


def _accumulate_count_row(
    count_map: dict[str, dict[str, int]],
    period_key: str | None,
    bucket_key: str | None,
    count: int,
) -> None:
    if period_key is None or bucket_key is None:
        return
    bucket = count_map.setdefault(period_key, {})
    bucket[bucket_key] = bucket.get(bucket_key, 0) + count


def _sector_bucket_key(sector_id) -> str:
    return NO_SECTOR_KEY if sector_id is None else str(sector_id)


def _build_sector_defs(
    sector_meta: dict[str, dict],
    sector_totals: dict[str, int],
) -> list[dict]:
    defs = [
        {
            "key": key,
            "label": meta["label"],
            "color": meta.get("color"),
        }
        for key, meta in sector_meta.items()
    ]
    defs.sort(key=lambda item: (-sector_totals.get(item["key"], 0), item["label"]))
    return defs


def _ingest_sector_rows(
    rows,
    *,
    sector_map: dict[str, dict[str, int]],
    sector_meta: dict[str, dict],
    sector_totals: dict[str, int],
) -> None:
    for day_value, sector_id, name, color, count in rows:
        period_key = _period_key_from_day(day_value)
        if period_key is None:
            continue
        key = _sector_bucket_key(sector_id)
        label = NO_SECTOR_KEY if sector_id is None else (name or key)
        sector_meta[key] = {"label": label, "color": color}
        sector_totals[key] = sector_totals.get(key, 0) + count
        _accumulate_count_row(sector_map, period_key, key, count)


def build_sector_totals(
    db: Session,
    filters: list[ColumnElement[bool]],
) -> list[dict]:
    counts_by_key: dict[str, int] = {}
    sector_rows = db.execute(
        _apply_filters(
            select(Ticket.sector_id, func.count())
            .select_from(Ticket)
            .group_by(Ticket.sector_id),
            filters,
        )
    ).all()
    for sector_id, count in sector_rows:
        key = NO_SECTOR_KEY if sector_id is None else str(sector_id)
        counts_by_key[key] = int(count)

    by_sector = []
    for sector in db.execute(select(Sector).order_by(Sector.name)).scalars().all():
        key = str(sector.id)
        by_sector.append(
            {
                "key": key,
                "label": sector.name,
                "count": counts_by_key.get(key, 0),
                "color": sector.color,
            }
        )

    none_count = counts_by_key.get(NO_SECTOR_KEY, 0)
    if none_count > 0:
        by_sector.append(
            {
                "key": NO_SECTOR_KEY,
                "label": NO_SECTOR_KEY,
                "count": none_count,
                "color": None,
            }
        )

    by_sector.sort(key=lambda item: (-item["count"], item["label"]))
    return by_sector


async def get_ticket_stats(
    db: Session,
    *,
    window: StatsWindow,
    sector_id: UUID | None = None,
) -> dict:
    period = window["period"]
    start = window["date_from"]
    end = window["date_to"]
    live_filters: list[ColumnElement[bool]] = [
        *sector_id_filters(sector_id),
    ]
    period_filters: list[ColumnElement[bool]] = [
        *created_at_window_filters(window),
        *live_filters,
    ]

    total = db.execute(
        _apply_filters(select(func.count()).select_from(Ticket), period_filters)
    ).scalar_one()

    status_counts = _count_map(
        list(
            db.execute(
                _apply_filters(
                    select(Ticket.status, func.count()).group_by(Ticket.status),
                    period_filters,
                )
            ).all()
        )
    )
    by_status = [{"key": status, "count": status_counts.get(status, 0)} for status in TICKET_STATUSES]

    live_status_counts = _count_map(
        list(
            db.execute(
                _apply_filters(
                    select(Ticket.status, func.count()).group_by(Ticket.status),
                    live_filters,
                )
            ).all()
        )
    )
    open_count = sum(live_status_counts.get(status, 0) for status in ACTIVE_TICKET_STATUSES)

    unassigned_count = db.execute(
        _apply_filters(
            select(func.count())
            .select_from(Ticket)
            .where(
                Ticket.assignee_user_id.is_(None),
                Ticket.status.in_(ACTIVE_TICKET_STATUSES),
            ),
            live_filters,
        )
    ).scalar_one()

    sla_bucket = case(
        (
            Ticket.sla_status == SLA_STATUS_DUE,
            case(
                (Ticket.first_responded_at.is_(None), SLA_CHART_DUE_FIRST_RESPONSE),
                else_=SLA_CHART_DUE_RESOLUTION,
            ),
        ),
        else_=Ticket.sla_status,
    )
    sla_counts = _count_map(
        list(
            db.execute(
                _apply_filters(
                    select(sla_bucket, func.count())
                    .where(Ticket.sla_status.is_not(None))
                    .group_by(sla_bucket),
                    period_filters,
                )
            ).all()
        )
    )
    by_sla = [
        {"key": status, "count": sla_counts.get(status, 0)}
        for status in SLA_STATUSES
    ]

    fulfilled_count = sla_counts.get(SLA_STATUS_FULFILLED, 0)
    failed_count = sla_counts.get(SLA_STATUS_FAILED, 0)
    decided = fulfilled_count + failed_count
    fulfillment_rate = round((fulfilled_count / decided) * 100, 1) if decided else None

    priorities = (
        db.execute(select(TicketPriority).order_by(TicketPriority.sort_order)).scalars().all()
    )
    priority_codes = [priority.code for priority in priorities]

    sector_map: dict[str, dict[str, int]] = {}
    sector_meta: dict[str, dict] = {}
    sector_totals: dict[str, int] = {}

    created_rows = db.execute(
        _apply_filters(
            select(func.date(Ticket.created_at), func.count()).group_by(
                func.date(Ticket.created_at)
            ),
            period_filters,
        )
    ).all()
    created_map: dict[str, int] = {}
    for day_value, count in created_rows:
        if day_value is None:
            continue
        if hasattr(day_value, "isoformat"):
            created_map[day_value.isoformat()] = count
        else:
            created_map[str(day_value)] = count

    priority_rows = db.execute(
        _apply_filters(
            select(func.date(Ticket.created_at), TicketPriority.code, func.count())
            .select_from(Ticket)
            .join(TicketPriority, TicketPriority.id == Ticket.priority_id)
            .group_by(func.date(Ticket.created_at), TicketPriority.code),
            period_filters,
        )
    ).all()
    priority_map: dict[str, dict[str, int]] = {}
    for day_value, priority_code, count in priority_rows:
        _accumulate_count_row(
            priority_map,
            _period_key_from_day(day_value),
            priority_code,
            count,
        )

    sector_rows_series = db.execute(
        _apply_filters(
            select(
                func.date(Ticket.created_at),
                Ticket.sector_id,
                Sector.name,
                Sector.color,
                func.count(),
            )
            .select_from(Ticket)
            .outerjoin(Sector, Sector.id == Ticket.sector_id)
            .group_by(
                func.date(Ticket.created_at),
                Ticket.sector_id,
                Sector.name,
                Sector.color,
            ),
            period_filters,
        )
    ).all()
    _ingest_sector_rows(
        sector_rows_series,
        sector_map=sector_map,
        sector_meta=sector_meta,
        sector_totals=sector_totals,
    )
    sector_defs = _build_sector_defs(sector_meta, sector_totals)
    created_by_day = _build_daily_series(
        start,
        end,
        created_map,
        priority_map,
        priority_codes,
        sector_map,
        sector_defs,
    )

    priority_counts = _count_map(
        list(
            db.execute(
                _apply_filters(
                    select(TicketPriority.code, func.count())
                    .select_from(Ticket)
                    .join(TicketPriority, TicketPriority.id == Ticket.priority_id)
                    .group_by(TicketPriority.code),
                    period_filters,
                )
            ).all()
        )
    )
    by_priority = [
        {"key": priority.code, "count": priority_counts.get(priority.code, 0)}
        for priority in priorities
    ]

    assignee_rows = db.execute(
        _apply_filters(
            select(Ticket.assignee_user_id, User.name, User.email, func.count())
            .select_from(Ticket)
            .outerjoin(User, User.id == Ticket.assignee_user_id)
            .where(Ticket.status.in_(ACTIVE_TICKET_STATUSES))
            .group_by(Ticket.assignee_user_id, User.name, User.email),
            live_filters,
        )
    ).all()
    by_assignee = []
    for assignee_id, name, email, count in assignee_rows:
        if assignee_id is None:
            by_assignee.append(
                {
                    "key": UNASSIGNED_KEY,
                    "label": UNASSIGNED_KEY,
                    "count": count,
                    "color": None,
                }
            )
        else:
            label = (name or "").strip() or (email or "").strip() or str(assignee_id)
            by_assignee.append(
                {
                    "key": str(assignee_id),
                    "label": label,
                    "count": count,
                    "color": None,
                }
            )
    by_assignee.sort(key=lambda item: (-item["count"], item["label"]))

    by_sector = build_sector_totals(db, period_filters)

    now = datetime.now()
    aging_expr = case(
        (Ticket.created_at >= now - timedelta(days=1), "lt_1d"),
        (Ticket.created_at >= now - timedelta(days=3), "d1_3"),
        (Ticket.created_at >= now - timedelta(days=7), "d3_7"),
        else_="gt_7d",
    )
    aging_counts = _count_map(
        list(
            db.execute(
                _apply_filters(
                    select(aging_expr, func.count())
                    .select_from(Ticket)
                    .where(Ticket.status.in_(ACTIVE_TICKET_STATUSES))
                    .group_by(aging_expr),
                    live_filters,
                )
            ).all()
        )
    )
    by_aging = [
        {"key": bucket, "count": aging_counts.get(bucket, 0)} for bucket in AGING_BUCKETS
    ]

    first_response_row = db.execute(
        _apply_filters(
            select(
                func.sum(
                    func.extract("epoch", Ticket.first_responded_at - Ticket.created_at)
                ),
                func.count(Ticket.first_responded_at),
            )
            .select_from(Ticket)
            .where(Ticket.first_responded_at.is_not(None)),
            period_filters,
        )
    ).one()
    first_response_seconds = first_response_row[0]
    first_response_samples = int(first_response_row[1] or 0)
    avg_first_response_minutes = (
        round((float(first_response_seconds) / first_response_samples) / 60.0, 1)
        if first_response_samples and first_response_seconds is not None
        else None
    )

    satisfaction_row = db.execute(
        _apply_filters(
            select(
                func.avg(Ticket.satisfaction_rating),
                func.count(Ticket.satisfaction_rating),
            )
            .select_from(Ticket)
            .where(Ticket.satisfaction_rating.is_not(None)),
            period_filters,
        )
    ).one()
    satisfaction_count = int(satisfaction_row[1] or 0)
    avg_satisfaction = (
        round(float(satisfaction_row[0]), 2) if satisfaction_count and satisfaction_row[0] is not None else None
    )

    sla_extras = _build_sla_series_and_groups(
        db,
        window=window,
        period_filters=period_filters,
        live_filters=live_filters,
        priorities=priorities,
    )

    return {
        "total": total,
        "open_count": open_count,
        "unassigned_count": unassigned_count,
        "fulfilled_count": fulfilled_count,
        "failed_count": failed_count,
        "fulfillment_rate": fulfillment_rate,
        "avg_first_response_minutes": avg_first_response_minutes,
        "avg_satisfaction": avg_satisfaction,
        "satisfaction_count": satisfaction_count,
        "by_status": by_status,
        "by_sla": by_sla,
        "by_priority": by_priority,
        "by_assignee": by_assignee,
        "by_sector": by_sector,
        "by_aging": by_aging,
        "created_by_day": created_by_day,
        "period": period,
        "date_from": start.isoformat(),
        "date_to": end.isoformat(),
        **sla_extras,
    }
