import json
from pathlib import Path

from starlette.requests import Request

SUPPORTED_LOCALES = frozenset({"pt-BR", "en"})
DEFAULT_LOCALE = "pt-BR"

_LOCALES_DIR = Path(__file__).parent / "locales"
_translations: dict[str, dict] = {}


def _load_translations() -> None:
    for path in _LOCALES_DIR.glob("*.json"):
        with path.open(encoding="utf-8") as file:
            _translations[path.stem] = json.load(file)


_load_translations()


def normalize_locale(locale: str | None) -> str:
    if not locale:
        return DEFAULT_LOCALE

    normalized = locale.strip().replace("_", "-")
    if normalized in SUPPORTED_LOCALES:
        return normalized

    primary = normalized.split("-")[0].lower()
    if primary == "pt":
        return "pt-BR"
    if primary == "en":
        return "en"

    return DEFAULT_LOCALE


def get_request_locale(request: Request) -> str:
    accept_language = request.headers.get("accept-language", "")
    for part in accept_language.split(","):
        candidate = part.strip().split(";")[0]
        normalized = normalize_locale(candidate)
        if normalized in SUPPORTED_LOCALES:
            return normalized

    return DEFAULT_LOCALE


def translate(key: str, locale: str | None = None, **kwargs: str) -> str:
    resolved_locale = normalize_locale(locale)
    value = _resolve_key(_translations.get(resolved_locale, {}), key)

    if value is None:
        value = _resolve_key(_translations.get(DEFAULT_LOCALE, {}), key)

    if not isinstance(value, str):
        return key

    return value.format(**kwargs) if kwargs else value


def _resolve_key(data: dict, key: str):
    current = data
    for part in key.split("."):
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return current
