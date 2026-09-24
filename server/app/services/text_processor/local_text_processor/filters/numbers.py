import re

# Códigos/números que podem ser palavras-chave relevantes.
_VERSION_PATTERN = re.compile(r"^v?\d+(?:\.\d+){1,3}$", re.IGNORECASE)
_HTTP_STATUS_PATTERN = re.compile(r"^[1-5]\d{2}$")
_ERROR_CODE_PATTERN = re.compile(
    r"^(?:err|error|e)[-_]?\d{2,6}$|^[a-z]{1,5}[-_]?\d{2,8}$",
    re.IGNORECASE,
)
_ORDER_ID_PATTERN = re.compile(r"^(?:pedido|order|id)[-_]?\d{3,}$", re.IGNORECASE)


def is_significant_number_token(token: str) -> bool:
    if _VERSION_PATTERN.fullmatch(token):
        return True
    if _HTTP_STATUS_PATTERN.fullmatch(token):
        return True
    if _ERROR_CODE_PATTERN.fullmatch(token):
        return True
    if _ORDER_ID_PATTERN.fullmatch(token):
        return True
    return False


def is_isolated_number(token: str) -> bool:
    if not any(char.isdigit() for char in token):
        return False
    if is_significant_number_token(token):
        return False
    # Apenas dígitos, ou dígitos com separadores triviais.
    compact = token.replace(".", "").replace(",", "").replace("-", "")
    return compact.isdigit()
