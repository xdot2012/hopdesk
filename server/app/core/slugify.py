import re
import unicodedata


def slugify(
    value: str,
    *,
    separator: str = "-",
    fallback: str = "item",
    max_length: int | None = None,
    ascii_only: bool = False,
) -> str:
    text = (value or "").strip()
    if ascii_only:
        text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", separator, text).strip(separator)
    if max_length is not None:
        text = text[:max_length]
    return text or fallback
