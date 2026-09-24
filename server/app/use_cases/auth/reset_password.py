import datetime

from fastapi import BackgroundTasks

from app.core.logs import get_logger
from app.core.token import TokenService
from app.core.encoding import encrypt_text, encode_base64

from app.services.email import EmailService
from app.services.email.content import EmailContent


async def send_reset_password_code_by_email(base_url: str, user_id: int, email: str, encryption_key: str, expires_at: datetime, token_service: TokenService,
                                            mail: EmailService, background_tasks: BackgroundTasks):
    reset_password_token = token_service.create_password_reset_token(key=encrypt_text(str(user_id), encryption_key=encryption_key), expiration_date=expires_at)
    encoded_token = encode_base64(reset_password_token)

    url = f"{base_url}/auth/reset_password/{encoded_token}"

    message = f"""
        <html>
            <h1>Here's your Reset Code:</h1>
            <a href="{url}">Click Here to Reset your Email</a>
            <span>Or copy and paste in your browser:</span><br />
            <span>{url}</span>
        </html>
    """
    content = EmailContent(
            to=[email],
            subject="Password Reset",
            message=message
        )

    logger = get_logger()
    logger.debug("Email Sent to: {to} with message: {message}".format(to=", ".join(content.to), message=content.message))

    background_tasks.add_task(mail.send_email, content)
    return encoded_token


async def send_password_has_been_changed_by_email(email: str, mail: EmailService, background_tasks: BackgroundTasks):
    message = f"""
        <html>
            <h1>Your Password Has Been Changed:</h1>
            <span>If you have not requested this change, please contact us immediately so we can resolve the situation.</span><br />
        </html>
    """
    content = EmailContent(
            to=[email],
            subject="Password Reseted",
            message=message
        )
    logger = get_logger()
    logger.debug("Email Sent to: {to} with message: {message}".format(to=", ".join(content.to), message=content.message))

    background_tasks.add_task(mail.send_email, content)

