from abc import abstractmethod
from .content import EmailContent

from fastapi_mail import FastMail, ConnectionConfig, MessageSchema, MessageType


class EmailRepository:
    @abstractmethod
    async def send_email(self, content: EmailContent):
        raise NotImplementedError


class FastAPIMAILEmailRepository(EmailRepository):

    def __init__(self, host: str, port: int, user: str, password: str, use_tls: bool = False, use_ssl_tls: bool = False,
                 use_credentials: bool = False, validate_certs: bool = False, debug: bool = True):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.debug = debug

        self.conf = ConnectionConfig(
            MAIL_USERNAME=user,
            MAIL_PASSWORD=password,
            MAIL_FROM=user,
            MAIL_PORT=port,
            MAIL_SERVER=host,
            MAIL_FROM_NAME=user,
            MAIL_STARTTLS=use_tls,
            MAIL_SSL_TLS=use_ssl_tls,
            USE_CREDENTIALS=use_credentials,
            VALIDATE_CERTS=validate_certs,
            MAIL_DEBUG=debug,
            SUPPRESS_SEND=debug,
        )

    async def send_email(self, content: EmailContent):
        fm = FastMail(self.conf)

        message = MessageSchema(
            subject=content.subject,
            recipients=content.to,
            body=content.message,
            subtype=MessageType.html
        )

        await fm.send_message(message)
