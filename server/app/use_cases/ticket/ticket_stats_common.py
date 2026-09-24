from datetime import date, datetime, timedelta
from typing import Literal, TypedDict

from sqlalchemy import Select
from sqlalchemy.sql import ColumnElement

from app.models.ticket.ticket import Ticket


UNASSIGNED_KEY = "unassigned"


NO_SECTOR_KEY = "none"


NO_AGENT_KEY = "unassigned"


GROUP_KEYS = ("priority", "requester", "agent", "sector")


StatsPeriod = Literal["last_15_days", "last_30_days", "custom"]


class StatsWindow(TypedDict):
    period: StatsPeriod
    date_from: date
    date_to: date


def _start_of_day(day: date) -> datetime:
    return datetime.combine(day, datetime.min.time())


def timestamp_window_filters(
    column: ColumnElement,
    window: StatsWindow,
) -> list[ColumnElement[bool]]:
    start = _start_of_day(window["date_from"])
    end_exclusive = _start_of_day(window["date_to"] + timedelta(days=1))
    return [
        column >= start,
        column < end_exclusive,
    ]


def _apply_filters(stmt: Select, filters: list[ColumnElement[bool]]) -> Select:
    for condition in filters:
        stmt = stmt.where(condition)
    return stmt


def _period_key_from_day(day_value) -> str | None:
    if day_value is None:
        return None
    if hasattr(day_value, "isoformat"):
        return day_value.isoformat()
    return str(day_value)
