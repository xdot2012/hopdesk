import datetime

from fastapi import BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.logs import get_logger
from app.core.token import TokenService
from app.core.encoding import encrypt_text, encode_base64

from app.services.email import EmailService
from app.services.email.content import EmailContent

from app.models.user.user import User


async def send_confirmation_code_by_email(base_url: str, system_name: str, email: str, expiration_date: datetime,
                                          encryption_key: str, token_service: TokenService, mail: EmailService,
                                          background_tasks: BackgroundTasks):
    email_confirm_token = token_service.create_email_confirm_token(
        key=encrypt_text(email, encryption_key=encryption_key), expiration_date=expiration_date)
    encoded_token = encode_base64(email_confirm_token)

    url = f"{base_url}/auth/confirm_email/{encoded_token}"
    message = f"""
            <html>
                <h1>Welcome to {system_name}!</h1>
                <span>Your new account has been created.</span><br />
                <a href='{url}'>Please click here to confirm your email.</span><br />
                <span>Or copy and paste the following link to your browser</span>
                <span>{url}</span>
            </html>
        """

    content = EmailContent(
        to=[email],
        subject="Confirm Your Email",
        message=message
    )

    logger = get_logger()
    logger.debug(
        "Email Sent to: {to} with message: {message}".format(to=", ".join(content.to), message=content.message))
    background_tasks.add_task(mail.send_email, content)
    return encoded_token


async def send_email_has_been_confirmed_email(email: str, mail: EmailService, background_tasks: BackgroundTasks):
    message = f"""
        <html>
            <h1>Email Successfully Confirmed:</h1>
            <span>Your email has been confirmed.</span><br />
        </html>
    """
    content = EmailContent(
            to=[email],
            subject="Email Confirmed",
            message=message
        )

    background_tasks.add_task(mail.send_email, content)
    logger = get_logger()
    logger.debug("Email Sent to: {to} with message: {message}".format(to=", ".join(content.to), message=content.message))


async def save_confirm_user_email(user_id: int, db: Session):
    result = db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    user.email_confirmed = True

    db.add(user)
    db.commit()
    return user
