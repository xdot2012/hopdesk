import html
import re
from urllib.parse import urlparse

import nh3

_ALLOWED_TAGS = {
    "p",
    "h1",
    "h2",
    "h3",
    "strong",
    "em",
    "u",
    "s",
    "span",
    "mark",
    "ul",
    "ol",
    "li",
    "a",
    "blockquote",
    "code",
    "pre",
    "br",
    "img",
    "iframe",
    "div",
}
_ALLOWED_ATTRIBUTES = {
    "a": {"href", "title", "target"},
    "img": {"src", "alt", "title", "width", "height"},
    "iframe": {"src", "width", "height", "allow", "allowfullscreen", "frameborder", "title"},
    "div": {"data-youtube-video"},
    "p": {"style"},
    "h1": {"style"},
    "h2": {"style"},
    "h3": {"style"},
    "span": {"style", "class", "data-type", "data-id", "data-label", "data-mention-suggestion-char"},
    "mark": {"style", "data-color"},
}
_UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
_MENTION_LABEL_RE = re.compile(r"^[\w .@+\-]{1,100}$", re.UNICODE)
_ALLOWED_STYLE_PROPERTIES = {
    "color",
    "background-color",
    "text-align",
}
_EMBED_HOSTS = (
    "www.youtube.com",
    "youtube.com",
    "www.youtube-nocookie.com",
    "youtube-nocookie.com",
    "player.vimeo.com",
    "vimeo.com",
)
_TAG_RE = re.compile(r"<[a-zA-Z/!?]")
_COLOR_VALUE_RE = re.compile(r"^(#[0-9a-fA-F]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$")
_TEXT_ALIGN_VALUE_RE = re.compile(r"^(left|right|center|justify)$")
_DATA_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{3,8}$")


def _sanitize_style_value(style: str) -> str | None:
    declarations: list[str] = []
    for declaration in style.split(";"):
        declaration = declaration.strip()
        if not declaration or ":" not in declaration:
            continue
        prop, value = declaration.split(":", 1)
        prop = prop.strip().lower()
        value = value.strip().lower()
        if prop not in _ALLOWED_STYLE_PROPERTIES:
            continue
        if prop == "text-align" and _TEXT_ALIGN_VALUE_RE.fullmatch(value):
            declarations.append(f"{prop}:{value}")
        elif prop in {"color", "background-color"} and _COLOR_VALUE_RE.fullmatch(value):
            declarations.append(f"{prop}:{value}")
    if not declarations:
        return None
    return ";".join(declarations)


def _attribute_filter(tag: str, attr: str, value: str) -> str | None:
    if attr == "style":
        return _sanitize_style_value(value)
    if attr == "data-color" and tag == "mark":
        normalized = value.strip()
        return normalized if _DATA_COLOR_RE.fullmatch(normalized) else None
    if tag == "span":
        normalized = (value or "").strip()
        if attr == "class":
            # Keep TipTap mention class; drop anything else.
            classes = [part for part in normalized.split() if part == "mention"]
            return " ".join(classes) or None
        if attr == "data-type":
            return "mention" if normalized.lower() == "mention" else None
        if attr == "data-id":
            return normalized if _UUID_RE.fullmatch(normalized) else None
        if attr == "data-label":
            return normalized if _MENTION_LABEL_RE.fullmatch(normalized) else None
        if attr == "data-mention-suggestion-char":
            return normalized if normalized == "@" else None
    return value


def strip_html_to_text(value: str) -> str:
    text = nh3.clean(value or "", tags=set())
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def plain_text_to_html(value: str) -> str:
    clean = (value or "").strip()
    if not clean:
        return "<p></p>"
    paragraphs = re.split(r"\n\s*\n", clean)
    parts: list[str] = []
    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        escaped = html.escape(paragraph).replace("\n", "<br>")
        parts.append(f"<p>{escaped}</p>")
    return "".join(parts) or "<p></p>"


def _is_allowed_image_src(src: str) -> bool:
    value = (src or "").strip()
    if not value:
        return False
    if value.startswith("/v1/files/"):
        return True
    parsed = urlparse(value)
    if parsed.scheme in ("http", "https") and parsed.netloc:
        return True
    return False


def _is_allowed_embed_src(src: str) -> bool:
    value = (src or "").strip()
    if not value:
        return False
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https"):
        return False
    host = (parsed.netloc or "").lower()
    return any(host == allowed or host.endswith(f".{allowed}") for allowed in _EMBED_HOSTS)


def _post_process_media_tags(cleaned: str) -> str:
    def replace_img(match: re.Match[str]) -> str:
        tag = match.group(0)
        src_match = re.search(r'src=["\']([^"\']+)["\']', tag, flags=re.IGNORECASE)
        if not src_match or not _is_allowed_image_src(src_match.group(1)):
            return ""
        return tag

    def replace_iframe(match: re.Match[str]) -> str:
        tag = match.group(0)
        src_match = re.search(r'src=["\']([^"\']+)["\']', tag, flags=re.IGNORECASE)
        if not src_match or not _is_allowed_embed_src(src_match.group(1)):
            return ""
        return tag

    result = re.sub(r"<img\b[^>]*>", replace_img, cleaned, flags=re.IGNORECASE)
    result = re.sub(r"<iframe\b[^>]*>.*?</iframe>", replace_iframe, result, flags=re.IGNORECASE | re.DOTALL)
    result = re.sub(r"<iframe\b[^>]*/?>", replace_iframe, result, flags=re.IGNORECASE)
    return result


def sanitize_article_html(body: str) -> str:
    raw = body or ""
    if not _TAG_RE.search(raw):
        raw = plain_text_to_html(raw)
    cleaned = nh3.clean(
        raw,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRIBUTES,
        attribute_filter=_attribute_filter,
    )
    cleaned = _post_process_media_tags(cleaned)
    return cleaned.strip() or "<p></p>"
