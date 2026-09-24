import re

_UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
_HEX_HASH_PATTERN = re.compile(r"^[0-9a-f]{16,}$", re.IGNORECASE)
_REPEATED_CHAR_PATTERN = re.compile(r"^(.)\1{4,}$")
_MIXED_NOISE_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*\d)[a-z\d]{8,}$", re.IGNORECASE)


def is_invalid_token(token: str) -> bool:
    if not token:
        return True

    if _UUID_PATTERN.fullmatch(token):
        return True
    if _HEX_HASH_PATTERN.fullmatch(token):
        return True
    if _REPEATED_CHAR_PATTERN.fullmatch(token):
        return True
    if token.replace("_", "").replace("-", "") == "":
        return True

    letters = sum(1 for char in token if char.isalpha())
    digits = sum(1 for char in token if char.isdigit())

    # Códigos numéricos significativos são tratados em numbers.py.
    if letters == 0 and digits > 0:
        return False

    if letters == 0:
        return True

    letter_ratio = letters / len(token)
    if letter_ratio < 0.4 and digits == 0:
        return True

    # Ruído alfanumérico sem estrutura (ex.: 123abc456), exceto códigos curtos.
    if len(token) >= 10 and _MIXED_NOISE_PATTERN.fullmatch(token):
        if token.count("-") == 0 and token.count(".") == 0:
            return True

    return False
