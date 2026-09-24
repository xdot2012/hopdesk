import re
from uuid import UUID

_MENTION_SPAN_RE = re.compile(r"<span\b[^>]*>", re.IGNORECASE)
_DATA_TYPE_MENTION_RE = re.compile(r"""data-type\s*=\s*["']mention["']""", re.IGNORECASE)
_DATA_ID_RE = re.compile(r"""data-id\s*=\s*["']([^"']+)["']""", re.IGNORECASE)


def extract_mentioned_user_ids(html: str | None) -> list[UUID]:
    """Extract unique user UUIDs from TipTap mention spans in HTML."""
    ids: list[UUID] = []
    seen: set[UUID] = set()
    for match in _MENTION_SPAN_RE.finditer(html or ""):
        tag = match.group(0)
        if not _DATA_TYPE_MENTION_RE.search(tag):
            continue
        id_match = _DATA_ID_RE.search(tag)
        if not id_match:
            continue
        raw = id_match.group(1).strip()
        try:
            user_id = UUID(raw)
        except ValueError:
            continue
        if user_id in seen:
            continue
        seen.add(user_id)
        ids.append(user_id)
    return ids
