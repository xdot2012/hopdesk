from datetime import date, datetime,timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.sql import ColumnElement

from app.core.ticket_constants import (
    SLA_STATUS_FAILED,
    SLA_STATUS_FULFILLED,
)
from app.models.sector.sector import Sector
from app.models.ticket.ticket import Ticket
from app.models.ticket.ticket_priority import TicketPriority
from app.models.user.user import User
from app.use_cases.ticket.ticket_stats_common import (
    GROUP_KEYS,
    NO_AGENT_KEY,
    NO_SECTOR_KEY,
    StatsWindow,
    UNASSIGNED_KEY,
    _apply_filters,
    _period_key_from_day,
    timestamp_window_filters,
)


def _avg_minutes(total_seconds: float | None, sample_count: int) -> float | None:
    if not sample_count or total_seconds is None:
        return None
    return round((total_seconds / sample_count) / 60.0, 1)


def _sla_rate(fulfilled: int, failed: int) -> float | None:
    decided = fulfilled + failed
    if not decided:
        return None
    return round((fulfilled / decided) * 100, 1)


def _sla_outcome(fulfilled: int, failed: int) -> dict:
    return {
        "fulfilled_count": fulfilled,
        "failed_count": failed,
        "rate": _sla_rate(fulfilled, failed),
    }


def _user_key_and_label(
    user_id,
    name: str | None,
    email: str | None,
    *,
    empty_key: str = UNASSIGNED_KEY,
) -> tuple[str, str]:
    if user_id is None:
        return empty_key, empty_key
    key = str(user_id)
    label = (name or "").strip() or (email or "").strip() or key
    return key, label


def _empty_group_bucket(key: str, label: str) -> dict:
    return {
        "key": key,
        "label": label,
        "opened": 0,
        "closed": 0,
        "fulfilled_count": 0,
        "failed_count": 0,
        "fulfillment_rate": None,
        "avg_first_response_minutes": None,
        "avg_resolution_minutes": None,
        "first_response_sla": _sla_outcome(0, 0),
        "resolution_sla": _sla_outcome(0, 0),
        "_fr_seconds": 0.0,
        "_fr_samples": 0,
        "_res_seconds": 0.0,
        "_res_samples": 0,
        "_fr_sla_fulfilled": 0,
        "_fr_sla_failed": 0,
        "_res_sla_fulfilled": 0,
        "_res_sla_failed": 0,
    }


def _finalize_group_bucket(bucket: dict) -> dict:
    fulfilled = int(bucket["fulfilled_count"])
    failed = int(bucket["failed_count"])
    return {
        "key": bucket["key"],
        "label": bucket["label"],
        "opened": int(bucket["opened"]),
        "closed": int(bucket["closed"]),
        "fulfilled_count": fulfilled,
        "failed_count": failed,
        "fulfillment_rate": _sla_rate(fulfilled, failed),
        "avg_first_response_minutes": _avg_minutes(
            bucket["_fr_seconds"] if bucket["_fr_samples"] else None,
            bucket["_fr_samples"],
        ),
        "avg_resolution_minutes": _avg_minutes(
            bucket["_res_seconds"] if bucket["_res_samples"] else None,
            bucket["_res_samples"],
        ),
        "first_response_sla": _sla_outcome(
            bucket["_fr_sla_fulfilled"],
            bucket["_fr_sla_failed"],
        ),
        "resolution_sla": _sla_outcome(
            bucket["_res_sla_fulfilled"],
            bucket["_res_sla_failed"],
        ),
    }


def _dense_days(start: date, end: date) -> list[str]:
    days: list[str] = []
    day = start
    while day <= end:
        days.append(day.isoformat())
        day += timedelta(days=1)
    return days


def _compute_first_response_sla_flags(
    *,
    response_due_at: datetime | None,
    first_responded_at: datetime | None,
    now: datetime,
) -> tuple[bool, bool]:
    """Return (is_fulfilled, is_failed) for first-response SLA; both false if undecided."""
    if response_due_at is None:
        return False, False
    if first_responded_at is not None:
        if first_responded_at <= response_due_at:
            return True, False
        return False, True
    if response_due_at < now:
        return False, True
    return False, False


def _compute_resolution_sla_flags(
    *,
    resolution_due_at: datetime | None,
    resolved_at: datetime | None,
) -> tuple[bool, bool]:
    if resolution_due_at is None or resolved_at is None:
        return False, False
    if resolved_at <= resolution_due_at:
        return True, False
    return False, True


def _build_sla_series_and_groups(
    db: Session,
    *,
    window: StatsWindow,
    period_filters: list[ColumnElement[bool]],
    live_filters: list[ColumnElement[bool]],
    priorities: list,
) -> dict:
    start = window["date_from"]
    end = window["date_to"]
    now = datetime.now()
    days = _dense_days(start, end)
    closed_filters = [
        *timestamp_window_filters(Ticket.resolved_at, window),
        *live_filters,
        Ticket.resolved_at.is_not(None),
    ]

    closed_count = int(
        db.execute(
            _apply_filters(select(func.count()).select_from(Ticket), closed_filters)
        ).scalar_one()
        or 0
    )

    resolution_row = db.execute(
        _apply_filters(
            select(
                func.sum(
                    func.extract("epoch", Ticket.resolved_at - Ticket.created_at)
                ),
                func.count(Ticket.resolved_at),
            )
            .select_from(Ticket)
            .where(Ticket.resolved_at.is_not(None)),
            period_filters,
        )
    ).one()
    avg_resolution_minutes = _avg_minutes(
        float(resolution_row[0]) if resolution_row[0] is not None else None,
        int(resolution_row[1] or 0),
    )

    # --- Load period tickets for phase SLA + group buckets ---
    period_ticket_rows = db.execute(
        _apply_filters(
            select(
                Ticket.id,
                Ticket.created_at,
                Ticket.resolved_at,
                Ticket.first_responded_at,
                Ticket.response_due_at,
                Ticket.resolution_due_at,
                Ticket.sla_status,
                Ticket.priority_id,
                TicketPriority.code,
                Ticket.requester_user_id,
                Ticket.assignee_user_id,
                Ticket.sector_id,
            )
            .select_from(Ticket)
            .join(TicketPriority, TicketPriority.id == Ticket.priority_id),
            period_filters,
        )
    ).all()

    requester_ids = {row.requester_user_id for row in period_ticket_rows if row.requester_user_id}
    assignee_ids = {row.assignee_user_id for row in period_ticket_rows if row.assignee_user_id}

    closed_ticket_rows = db.execute(
        _apply_filters(
            select(
                Ticket.id,
                Ticket.created_at,
                Ticket.resolved_at,
                Ticket.first_responded_at,
                Ticket.response_due_at,
                Ticket.resolution_due_at,
                Ticket.sla_status,
                Ticket.priority_id,
                TicketPriority.code,
                Ticket.requester_user_id,
                Ticket.assignee_user_id,
                Ticket.sector_id,
            )
            .select_from(Ticket)
            .join(TicketPriority, TicketPriority.id == Ticket.priority_id),
            closed_filters,
        )
    ).all()
    requester_ids |= {row.requester_user_id for row in closed_ticket_rows if row.requester_user_id}
    assignee_ids |= {row.assignee_user_id for row in closed_ticket_rows if row.assignee_user_id}

    user_labels: dict[str, str] = {}
    if requester_ids or assignee_ids:
        user_rows = db.execute(
            select(User.id, User.name, User.email).where(
                User.id.in_(list(requester_ids | assignee_ids))
            )
        ).all()
        for user_id, name, email in user_rows:
            key, label = _user_key_and_label(user_id, name, email)
            user_labels[key] = label

    sector_label_map: dict[str, str] = {NO_SECTOR_KEY: NO_SECTOR_KEY}
    all_sectors = list(db.execute(select(Sector).order_by(Sector.name)).scalars().all())
    for sector in all_sectors:
        sector_label_map[str(sector.id)] = sector.name

    priority_label_map = {p.code: p.code for p in priorities}

    def group_meta(dimension: str, row) -> tuple[str, str]:
        if dimension == "priority":
            return row.code, priority_label_map.get(row.code, row.code)
        if dimension == "requester":
            key, _ = _user_key_and_label(row.requester_user_id, None, None)
            return key, user_labels.get(key, key)
        if dimension == "agent":
            key, _ = _user_key_and_label(
                row.assignee_user_id, None, None, empty_key=NO_AGENT_KEY
            )
            return key, user_labels.get(key, key)
        key = NO_SECTOR_KEY if row.sector_id is None else str(row.sector_id)
        return key, sector_label_map.get(key, key)

    fr_fulfilled = 0
    fr_failed = 0
    res_fulfilled = 0
    res_failed = 0

    group_buckets: dict[str, dict[str, dict]] = {dim: {} for dim in GROUP_KEYS}

    def ensure_bucket(dimension: str, key: str, label: str) -> dict:
        bucket = group_buckets[dimension].get(key)
        if bucket is None:
            bucket = _empty_group_bucket(key, label)
            group_buckets[dimension][key] = bucket
        return bucket

    # Always expose every cadastrado sector in the sector grouping (even with zeros).
    for sector in all_sectors:
        ensure_bucket("sector", str(sector.id), sector.name)

    # Opened + overall SLA status + times + first-response SLA (period created)
    for row in period_ticket_rows:
        fr_ok, fr_bad = _compute_first_response_sla_flags(
            response_due_at=row.response_due_at,
            first_responded_at=row.first_responded_at,
            now=now,
        )
        if fr_ok:
            fr_fulfilled += 1
        elif fr_bad:
            fr_failed += 1

        res_ok, res_bad = _compute_resolution_sla_flags(
            resolution_due_at=row.resolution_due_at,
            resolved_at=row.resolved_at,
        )
        if res_ok:
            res_fulfilled += 1
        elif res_bad:
            res_failed += 1

        for dim in GROUP_KEYS:
            key, label = group_meta(dim, row)
            bucket = ensure_bucket(dim, key, label)
            bucket["opened"] += 1
            if (
                row.sla_status
                == SLA_STATUS_FULFILLED
            ):
                bucket["fulfilled_count"] += 1
            elif (
                row.sla_status
                == SLA_STATUS_FAILED
            ):
                bucket["failed_count"] += 1
            if fr_ok:
                bucket["_fr_sla_fulfilled"] += 1
            elif fr_bad:
                bucket["_fr_sla_failed"] += 1
            if res_ok:
                bucket["_res_sla_fulfilled"] += 1
            elif res_bad:
                bucket["_res_sla_failed"] += 1
            if row.first_responded_at is not None and row.created_at is not None:
                bucket["_fr_seconds"] += (
                    row.first_responded_at - row.created_at
                ).total_seconds()
                bucket["_fr_samples"] += 1
            if row.resolved_at is not None and row.created_at is not None:
                bucket["_res_seconds"] += (row.resolved_at - row.created_at).total_seconds()
                bucket["_res_samples"] += 1

    # Closed counts by group (resolved_at window) — agent grouping uses closer = assignee
    for row in closed_ticket_rows:
        for dim in GROUP_KEYS:
            key, label = group_meta(dim, row)
            bucket = ensure_bucket(dim, key, label)
            bucket["closed"] += 1

    by_group = {
        dim: sorted(
            [_finalize_group_bucket(b) for b in group_buckets[dim].values()],
            key=lambda item: (
                (-(item["opened"] + item["closed"]), item["label"])
                if dim != "sector"
                else (item["label"],)
            ),
        )
        for dim in GROUP_KEYS
    }

    # --- Daily totals ---
    opened_map: dict[str, int] = {}
    opened_by_group: dict[str, dict[str, dict[str, int]]] = {
        dim: {} for dim in GROUP_KEYS
    }
    for row in period_ticket_rows:
        day_key = _period_key_from_day(
            row.created_at.date() if hasattr(row.created_at, "date") else row.created_at
        )
        if day_key is None:
            continue
        opened_map[day_key] = opened_map.get(day_key, 0) + 1
        for dim in GROUP_KEYS:
            key, _label = group_meta(dim, row)
            day_bucket = opened_by_group[dim].setdefault(day_key, {})
            day_bucket[key] = day_bucket.get(key, 0) + 1

    closed_map: dict[str, int] = {}
    closed_by_group: dict[str, dict[str, dict[str, int]]] = {
        dim: {} for dim in GROUP_KEYS
    }
    for row in closed_ticket_rows:
        day_key = _period_key_from_day(
            row.resolved_at.date() if hasattr(row.resolved_at, "date") else row.resolved_at
        )
        if day_key is None:
            continue
        closed_map[day_key] = closed_map.get(day_key, 0) + 1
        for dim in GROUP_KEYS:
            key, _label = group_meta(dim, row)
            day_bucket = closed_by_group[dim].setdefault(day_key, {})
            day_bucket[key] = day_bucket.get(key, 0) + 1

    # Avg time by day (event day)
    fr_day_seconds: dict[str, float] = {}
    fr_day_samples: dict[str, int] = {}
    res_day_seconds: dict[str, float] = {}
    res_day_samples: dict[str, int] = {}
    fr_day_group: dict[str, dict[str, dict[str, float | int]]] = {
        dim: {} for dim in GROUP_KEYS
    }
    res_day_group: dict[str, dict[str, dict[str, float | int]]] = {
        dim: {} for dim in GROUP_KEYS
    }

    # Use both period and closed rows for event-based times within window
    def ingest_time_events(rows, *, require_created_in_period: bool) -> None:
        for row in rows:
            if row.first_responded_at is not None and row.created_at is not None:
                fr_day = row.first_responded_at.date() if hasattr(row.first_responded_at, "date") else None
                if fr_day and start <= fr_day <= end:
                    day_key = fr_day.isoformat()
                    secs = (row.first_responded_at - row.created_at).total_seconds()
                    fr_day_seconds[day_key] = fr_day_seconds.get(day_key, 0.0) + secs
                    fr_day_samples[day_key] = fr_day_samples.get(day_key, 0) + 1
                    for dim in GROUP_KEYS:
                        key, _ = group_meta(dim, row)
                        g = fr_day_group[dim].setdefault(day_key, {}).setdefault(
                            key, {"seconds": 0.0, "samples": 0}
                        )
                        g["seconds"] = float(g["seconds"]) + secs
                        g["samples"] = int(g["samples"]) + 1
            if row.resolved_at is not None and row.created_at is not None:
                res_day = row.resolved_at.date() if hasattr(row.resolved_at, "date") else None
                if res_day and start <= res_day <= end:
                    day_key = res_day.isoformat()
                    secs = (row.resolved_at - row.created_at).total_seconds()
                    res_day_seconds[day_key] = res_day_seconds.get(day_key, 0.0) + secs
                    res_day_samples[day_key] = res_day_samples.get(day_key, 0) + 1
                    for dim in GROUP_KEYS:
                        key, _ = group_meta(dim, row)
                        g = res_day_group[dim].setdefault(day_key, {}).setdefault(
                            key, {"seconds": 0.0, "samples": 0}
                        )
                        g["seconds"] = float(g["seconds"]) + secs
                        g["samples"] = int(g["samples"]) + 1

    ingest_time_events(period_ticket_rows, require_created_in_period=True)
    # Closed-only tickets not already in period set
    period_ids = {row.id for row in period_ticket_rows}
    extra_closed = [row for row in closed_ticket_rows if row.id not in period_ids]
    ingest_time_events(extra_closed, require_created_in_period=False)

    # SLA compliance by day (by resolved_at terminal status)
    sla_day: dict[str, dict[str, int]] = {}
    sla_day_group: dict[str, dict[str, dict[str, dict[str, int]]]] = {
        dim: {} for dim in GROUP_KEYS
    }
    for row in closed_ticket_rows:
        day_key = _period_key_from_day(
            row.resolved_at.date() if hasattr(row.resolved_at, "date") else row.resolved_at
        )
        if day_key is None:
            continue
        bucket = sla_day.setdefault(day_key, {"fulfilled": 0, "failed": 0})
        status = row.sla_status
        if status == SLA_STATUS_FULFILLED:
            bucket["fulfilled"] += 1
        elif status == SLA_STATUS_FAILED:
            bucket["failed"] += 1
        else:
            continue
        for dim in GROUP_KEYS:
            key, _ = group_meta(dim, row)
            g = sla_day_group[dim].setdefault(day_key, {}).setdefault(
                key, {"fulfilled": 0, "failed": 0}
            )
            if status == SLA_STATUS_FULFILLED:
                g["fulfilled"] += 1
            else:
                g["failed"] += 1

    # Label lookups for series
    label_maps: dict[str, dict[str, str]] = {
        "priority": {b["key"]: b["label"] for b in by_group["priority"]},
        "requester": {b["key"]: b["label"] for b in by_group["requester"]},
        "agent": {b["key"]: b["label"] for b in by_group["agent"]},
        "sector": {b["key"]: b["label"] for b in by_group["sector"]},
    }

    open_closed_by_day = [
        {
            "date": day,
            "opened": opened_map.get(day, 0),
            "closed": closed_map.get(day, 0),
        }
        for day in days
    ]

    avg_time_by_day = [
        {
            "date": day,
            "avg_first_response_minutes": _avg_minutes(
                fr_day_seconds.get(day), fr_day_samples.get(day, 0)
            ),
            "avg_resolution_minutes": _avg_minutes(
                res_day_seconds.get(day), res_day_samples.get(day, 0)
            ),
        }
        for day in days
    ]

    sla_compliance_by_day = []
    for day in days:
        fulfilled = sla_day.get(day, {}).get("fulfilled", 0)
        failed = sla_day.get(day, {}).get("failed", 0)
        sla_compliance_by_day.append(
            {
                "date": day,
                "fulfilled_count": fulfilled,
                "failed_count": failed,
                "fulfillment_rate": _sla_rate(fulfilled, failed),
            }
        )

    def build_open_closed_grouped(dim: str) -> list[dict]:
        series = []
        group_defs = by_group[dim]
        include_zeros = dim == "sector"
        for day in days:
            open_counts = opened_by_group[dim].get(day, {})
            close_counts = closed_by_group[dim].get(day, {})
            keys = {g["key"] for g in group_defs} | set(open_counts) | set(close_counts)
            items = []
            for key in keys:
                opened_n = open_counts.get(key, 0)
                closed_n = close_counts.get(key, 0)
                if not include_zeros and opened_n == 0 and closed_n == 0:
                    continue
                # Prefer stable order from group_defs for sector
                items.append(
                    {
                        "key": key,
                        "label": label_maps[dim].get(key, key),
                        "count": opened_n,
                        "opened": opened_n,
                        "closed": closed_n,
                    }
                )
            if include_zeros:
                order = {g["key"]: index for index, g in enumerate(group_defs)}
                items.sort(key=lambda item: order.get(item["key"], 10_000))
            series.append(
                {
                    "date": day,
                    "opened": opened_map.get(day, 0),
                    "closed": closed_map.get(day, 0),
                    "by_group": items,
                }
            )
        return series

    def build_avg_time_grouped(dim: str) -> list[dict]:
        series = []
        group_defs = by_group[dim]
        include_zeros = dim == "sector"
        for day in days:
            items = []
            fr_g = fr_day_group[dim].get(day, {})
            res_g = res_day_group[dim].get(day, {})
            keys = (
                {g["key"] for g in group_defs}
                if include_zeros
                else (set(fr_g) | set(res_g))
            )
            for key in keys:
                fr = fr_g.get(key)
                res = res_g.get(key)
                if not include_zeros and not fr and not res:
                    continue
                items.append(
                    {
                        "key": key,
                        "label": label_maps[dim].get(key, key),
                        "avg_first_response_minutes": _avg_minutes(
                            float(fr["seconds"]) if fr else None,
                            int(fr["samples"]) if fr else 0,
                        ),
                        "avg_resolution_minutes": _avg_minutes(
                            float(res["seconds"]) if res else None,
                            int(res["samples"]) if res else 0,
                        ),
                    }
                )
            if include_zeros:
                order = {g["key"]: index for index, g in enumerate(group_defs)}
                items.sort(key=lambda item: order.get(item["key"], 10_000))
            series.append(
                {
                    "date": day,
                    "avg_first_response_minutes": _avg_minutes(
                        fr_day_seconds.get(day), fr_day_samples.get(day, 0)
                    ),
                    "avg_resolution_minutes": _avg_minutes(
                        res_day_seconds.get(day), res_day_samples.get(day, 0)
                    ),
                    "by_group": items,
                }
            )
        return series

    def build_sla_grouped(dim: str) -> list[dict]:
        series = []
        group_defs = by_group[dim]
        include_zeros = dim == "sector"
        for day in days:
            fulfilled = sla_day.get(day, {}).get("fulfilled", 0)
            failed = sla_day.get(day, {}).get("failed", 0)
            day_groups = sla_day_group[dim].get(day, {})
            keys = (
                {g["key"] for g in group_defs}
                if include_zeros
                else set(day_groups)
            )
            items = []
            for key in keys:
                g = day_groups.get(key, {"fulfilled": 0, "failed": 0})
                f = g.get("fulfilled", 0)
                fail = g.get("failed", 0)
                if not include_zeros and f == 0 and fail == 0:
                    continue
                items.append(
                    {
                        "key": key,
                        "label": label_maps[dim].get(key, key),
                        "fulfilled_count": f,
                        "failed_count": fail,
                        "fulfillment_rate": _sla_rate(f, fail),
                    }
                )
            if include_zeros:
                order = {g["key"]: index for index, g in enumerate(group_defs)}
                items.sort(key=lambda item: order.get(item["key"], 10_000))
            series.append(
                {
                    "date": day,
                    "fulfilled_count": fulfilled,
                    "failed_count": failed,
                    "fulfillment_rate": _sla_rate(fulfilled, failed),
                    "by_group": items,
                }
            )
        return series

    return {
        "closed_count": closed_count,
        "avg_resolution_minutes": avg_resolution_minutes,
        "first_response_sla": _sla_outcome(fr_fulfilled, fr_failed),
        "resolution_sla": _sla_outcome(res_fulfilled, res_failed),
        "open_closed_by_day": open_closed_by_day,
        "avg_time_by_day": avg_time_by_day,
        "sla_compliance_by_day": sla_compliance_by_day,
        "by_group": by_group,
        "open_closed_by_day_by_group": {
            dim: build_open_closed_grouped(dim) for dim in GROUP_KEYS
        },
        "avg_time_by_day_by_group": {
            dim: build_avg_time_grouped(dim) for dim in GROUP_KEYS
        },
        "sla_compliance_by_day_by_group": {
            dim: build_sla_grouped(dim) for dim in GROUP_KEYS
        },
    }
