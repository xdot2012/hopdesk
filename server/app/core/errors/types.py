from typing import TypedDict, List


class APIError(TypedDict):
    detail:  str


class FieldValidationError(TypedDict):
    field: str
    type: str
    message: str


class APIValidationError(TypedDict):
    detail: List[FieldValidationError]
