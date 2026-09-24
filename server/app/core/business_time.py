"""Business-hours helpers for SLA.

Naive datetimes are treated as wall-clock in the calendar timezone.

Multi-calendar union semantics:
  useful at t ⇔ ∃ calendar C: t ∈ intervals(C) ∧ date(t) is not a holiday of C
"""

from __future__ import annotations

import datetime
from typing import TypedDict
from zoneinfo import ZoneInfo

# Interval-like objects need: weekday (0=Mon..6=Sun), start_time, end_time
# Holiday-like objects need: month, day, year (optional), recurring_yearly


class JourneyCalendar(TypedDict):
    intervals: list
    holidays: list
    timezone_name: str


def _ensure_tz(dt: datetime.datetime, tz: ZoneInfo) -> datetime.datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=tz)
    return dt.astimezone(tz)


def _as_naive(dt: datetime.datetime) -> datetime.datetime:
    return dt.replace(tzinfo=None)


def _is_holiday(day: datetime.date, holidays: list) -> bool:
    for holiday in holidays:
        if holiday.month != day.month or holiday.day != day.day:
            continue
        if getattr(holiday, "recurring_yearly", True) and holiday.year is None:
            return True
        if holiday.year is not None and holiday.year == day.year:
            return True
        if getattr(holiday, "recurring_yearly", False) and holiday.year is None:
            return True
    return False


def _intervals_for_weekday(intervals: list, weekday: int) -> list:
    return sorted(
        [i for i in intervals if i.weekday == weekday],
        key=lambda i: i.start_time,
    )


def _clip_interval_minutes(
    day: datetime.date,
    start_t: datetime.time,
    end_t: datetime.time,
    window_start: datetime.datetime,
    window_end: datetime.datetime,
    tz: ZoneInfo,
) -> int:
    if end_t <= start_t:
        return 0
    interval_start = datetime.datetime.combine(day, start_t, tzinfo=tz)
    interval_end = datetime.datetime.combine(day, end_t, tzinfo=tz)
    lo = max(interval_start, window_start)
    hi = min(interval_end, window_end)
    if hi <= lo:
        return 0
    return int((hi - lo).total_seconds() // 60)


def _merge_segments(segments: list[tuple[datetime.time, datetime.time]]) -> list[tuple[datetime.time, datetime.time]]:
    if not segments:
        return []
    ordered = sorted(segments, key=lambda item: (item[0], item[1]))
    merged: list[tuple[datetime.time, datetime.time]] = [ordered[0]]
    for start, end in ordered[1:]:
        last_start, last_end = merged[-1]
        if start <= last_end:
            merged[-1] = (last_start, max(last_end, end))
        else:
            merged.append((start, end))
    return merged


def _reference_timezone(calendars: list[JourneyCalendar]) -> str:
    if not calendars:
        return "America/Sao_Paulo"
    return calendars[0]["timezone_name"] or "America/Sao_Paulo"


def _union_segments_for_day(
    day: datetime.date,
    calendars: list[JourneyCalendar],
) -> list[tuple[datetime.time, datetime.time]]:
    segments: list[tuple[datetime.time, datetime.time]] = []
    weekday = day.weekday()
    for calendar in calendars:
        if _is_holiday(day, calendar["holidays"] or []):
            continue
        for interval in _intervals_for_weekday(calendar["intervals"] or [], weekday):
            if interval.end_time <= interval.start_time:
                continue
            segments.append((interval.start_time, interval.end_time))
    return _merge_segments(segments)


def is_within_intervals(
    now: datetime.datetime,
    intervals: list,
    timezone_name: str,
    holidays: list | None = None,
) -> bool:
    return is_within_journey_union(
        now,
        [
            {
                "intervals": intervals,
                "holidays": holidays or [],
                "timezone_name": timezone_name,
            }
        ],
    )


def is_within_journey_union(now: datetime.datetime, calendars: list[JourneyCalendar]) -> bool:
    if not calendars:
        return False
    tz = ZoneInfo(_reference_timezone(calendars))
    local = _ensure_tz(now, tz)
    day = local.date()
    current = local.time().replace(microsecond=0)
    for start, end in _union_segments_for_day(day, calendars):
        if start <= current < end:
            return True
    return False


def business_minutes_between(
    start: datetime.datetime,
    end: datetime.datetime,
    intervals: list,
    holidays: list,
    timezone_name: str,
) -> int:
    return business_minutes_between_union(
        start,
        end,
        [
            {
                "intervals": intervals,
                "holidays": holidays,
                "timezone_name": timezone_name,
            }
        ],
    )


def business_minutes_between_union(
    start: datetime.datetime,
    end: datetime.datetime,
    calendars: list[JourneyCalendar],
) -> int:
    if not calendars:
        delta = end - start
        return max(int(delta.total_seconds() // 60), 0)

    has_intervals = any(calendar["intervals"] for calendar in calendars)
    if not has_intervals:
        delta = end - start
        return max(int(delta.total_seconds() // 60), 0)

    tz = ZoneInfo(_reference_timezone(calendars))
    start_local = _ensure_tz(start, tz)
    end_local = _ensure_tz(end, tz)
    if end_local <= start_local:
        return 0

    total = 0
    day = start_local.date()
    last_day = end_local.date()
    while day <= last_day:
        for start_t, end_t in _union_segments_for_day(day, calendars):
            total += _clip_interval_minutes(
                day,
                start_t,
                end_t,
                start_local,
                end_local,
                tz,
            )
        day += datetime.timedelta(days=1)
    return total


def add_business_minutes(
    start: datetime.datetime,
    minutes: int,
    intervals: list,
    holidays: list,
    timezone_name: str,
) -> datetime.datetime:
    return add_business_minutes_union(
        start,
        minutes,
        [
            {
                "intervals": intervals,
                "holidays": holidays,
                "timezone_name": timezone_name,
            }
        ],
    )


def add_business_minutes_union(
    start: datetime.datetime,
    minutes: int,
    calendars: list[JourneyCalendar],
) -> datetime.datetime:
    timezone_name = _reference_timezone(calendars)
    if minutes <= 0:
        return _as_naive(_ensure_tz(start, ZoneInfo(timezone_name)))

    has_intervals = any(calendar["intervals"] for calendar in calendars)
    if not calendars or not has_intervals:
        return _as_naive(_ensure_tz(start, ZoneInfo(timezone_name))) + datetime.timedelta(minutes=minutes)

    tz = ZoneInfo(timezone_name)
    cursor = _ensure_tz(start, tz)
    remaining = minutes
    max_days = 366 * 5
    days_scanned = 0

    while remaining > 0 and days_scanned < max_days:
        day = cursor.date()
        day_segments = _union_segments_for_day(day, calendars)
        advanced = False
        for start_t, end_t in day_segments:
            interval_start = datetime.datetime.combine(day, start_t, tzinfo=tz)
            interval_end = datetime.datetime.combine(day, end_t, tzinfo=tz)
            if interval_end <= interval_start:
                continue
            if cursor >= interval_end:
                continue
            if cursor < interval_start:
                cursor = interval_start
            available = int((interval_end - cursor).total_seconds() // 60)
            if available <= 0:
                continue
            if remaining <= available:
                cursor = cursor + datetime.timedelta(minutes=remaining)
                remaining = 0
                advanced = True
                break
            remaining -= available
            cursor = interval_end
            advanced = True

        if remaining <= 0:
            break
        last_end = day_segments[-1][1] if day_segments else datetime.time(0)
        if not advanced or cursor.time() >= last_end:
            cursor = datetime.datetime.combine(
                day + datetime.timedelta(days=1),
                datetime.time(0, 0),
                tzinfo=tz,
            )
            days_scanned += 1
        elif cursor.date() == day and not day_segments:
            cursor = datetime.datetime.combine(
                day + datetime.timedelta(days=1),
                datetime.time(0, 0),
                tzinfo=tz,
            )
            days_scanned += 1

    return _as_naive(cursor)
