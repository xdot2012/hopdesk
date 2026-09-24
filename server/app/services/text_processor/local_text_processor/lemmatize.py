"""Lematização leve por sufixos — agrega variações sem gerar radicais ilegíveis."""

_PORTUGUESE_SUFFIX_RULES: tuple[tuple[str, str], ...] = (
    ("acoes", "acao"),
    ("coes", "cao"),
    ("oes", "ao"),
    ("aes", "ao"),
    ("amentos", "amento"),
    ("imentos", "imento"),
    ("idades", "idade"),
    ("encias", "encia"),
    ("ancias", "ancia"),
    ("aveis", "avel"),
    ("iveis", "ivel"),
    ("ando", "ar"),
    ("endo", "er"),
    ("indo", "ir"),
    ("ados", "ado"),
    ("adas", "ada"),
    ("idos", "ido"),
    ("idas", "ida"),
    ("aram", "ar"),
    ("eram", "er"),
    ("iram", "ir"),
    ("eis", "el"),
    ("ais", "al"),
    ("ois", "ol"),
    ("ns", "m"),
    ("ou", "ar"),
    ("s", ""),
)

_ENGLISH_SUFFIX_RULES: tuple[tuple[str, str], ...] = (
    ("ingly", ""),
    ("edly", ""),
    ("ation", "ate"),
    ("ments", "ment"),
    ("ings", ""),
    ("ies", "y"),
    ("ied", "y"),
    ("ing", ""),
    ("ed", ""),
    ("ly", ""),
    ("es", ""),
    ("s", ""),
)

_MIN_LEMMA_LENGTH = 3


def lemmatize_token(token: str, language: str) -> str:
    primary = (language or "pt").strip().lower().replace("_", "-").split("-")[0]
    rules = _PORTUGUESE_SUFFIX_RULES if primary == "pt" else _ENGLISH_SUFFIX_RULES

    for suffix, replacement in rules:
        if not token.endswith(suffix):
            continue
        # Evita "ou" → "ar" em palavras curtas (ex.: "sou").
        if suffix == "ou" and len(token) < 6:
            continue
        if len(token) - len(suffix) + len(replacement) < _MIN_LEMMA_LENGTH:
            continue
        candidate = token[: -len(suffix)] + replacement
        if len(candidate) >= _MIN_LEMMA_LENGTH:
            return candidate

    return token
