from .content import EmailContent
from .repository import EmailRepository
import asyncio


class EmailService:
    def __init__(self, repository: EmailRepository):
        self.repository = repository

    def send_email(self, content: EmailContent):
        return asyncio.run(self.repository.send_email(content))

