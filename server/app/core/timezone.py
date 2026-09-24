DEFAULT_TIMEZONE = "America/Sao_Paulo"


def normalize_timezone(timezone: str | None) -> str | None:
    cleaned = (timezone or "").strip()
    if not cleaned:
        return None
    try:
        from zoneinfo import ZoneInfo

        ZoneInfo(cleaned)
    except Exception:
        return None
    return cleaned
