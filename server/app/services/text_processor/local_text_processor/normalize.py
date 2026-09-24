import re
import unicodedata

_URL_PATTERN = re.compile(
    r"https?://\S+|www\.\S+",
    re.IGNORECASE,
)
_EMAIL_PATTERN = re.compile(
    r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b",
)
_MENTION_PATTERN = re.compile(r"[@#][\w.-]+")
_EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "\U0001F900-\U0001F9FF"
    "\U0001FA70-\U0001FAFF"
    "]+",
    flags=re.UNICODE,
)
_WHITESPACE_PATTERN = re.compile(r"\s+")


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def normalize_text(text: str) -> str:
    cleaned = unicodedata.normalize("NFKC", text)
    cleaned = _URL_PATTERN.sub(" ", cleaned)
    cleaned = _EMAIL_PATTERN.sub(" ", cleaned)
    cleaned = _MENTION_PATTERN.sub(" ", cleaned)
    cleaned = _EMOJI_PATTERN.sub(" ", cleaned)
    cleaned = cleaned.lower()
    cleaned = strip_accents(cleaned)
    cleaned = re.sub(r"[^\w\s./:-]", " ", cleaned, flags=re.UNICODE)
    cleaned = _WHITESPACE_PATTERN.sub(" ", cleaned).strip()
    return cleaned
