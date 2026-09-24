from typing import Literal

from fastapi import Query
from pydantic import field_validator

from .base import RequestBaseModel
import re

camel_to_snake_regex = re.compile('((?<=[a-z0-9])[A-Z]|(?!^)[A-Z](?=[a-z]))')


def to_snakecase(string):
    return camel_to_snake_regex.sub(r'_\1', string)


class SimplePaginatedRequestParams(RequestBaseModel):
    page: int = Query(1, ge=1)
    size: int = Query(10, ge=1, le=100)


class PaginatedRequestParams(SimplePaginatedRequestParams):
    q: str = ""
    order_by: str = "id"
    order: Literal["asc", "desc"] = "desc"
    page: int = Query(1, ge=1)
    size: int = Query(10, ge=1, le=100)

    @field_validator("order_by", mode="after")
    @classmethod
    def transform(cls, raw: str) -> tuple[int, int]:
        return to_snakecase(raw)
