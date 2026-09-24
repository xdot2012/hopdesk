"""Fixed business-hours calendar for SLA (Mon–Fri 09:00–18:00)."""

from __future__ import annotations

import datetime
from types import SimpleNamespace

from app.core.business_time import JourneyCalendar

DEFAULT_TIMEZONE = "America/Sao_Paulo"
DEFAULT_WEEKDAYS = (0, 1, 2, 3, 4)
DEFAULT_START = datetime.time(9, 0)
DEFAULT_END = datetime.time(18, 0)


def default_business_calendars(
    timezone_name: str | None = None,
) -> list[JourneyCalendar]:
    intervals = [
        SimpleNamespace(
            weekday=weekday,
            start_time=DEFAULT_START,
            end_time=DEFAULT_END,
        )
        for weekday in DEFAULT_WEEKDAYS
    ]
    cleaned = (timezone_name or "").strip() or DEFAULT_TIMEZONE
    return [
        {
            "intervals": intervals,
            "holidays": [],
            "timezone_name": cleaned,
        }
    ]
