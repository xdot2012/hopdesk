from typing import List

from pydantic import BaseModel


class EmailContent(BaseModel):
    to: List[str]
    subject: str
    message: str