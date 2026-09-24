from uuid import UUID
import random
import datetime

from fastapi import BackgroundTasks
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.logs import get_logger
from app.models import TwoFactor
from app.services.email import EmailService
from app.services.email.content import EmailContent


def get_active_two_factor_codes(db: Session) -> set[str]:
    now = datetime.datetime.now()
    rows = db.execute(
        select(TwoFactor.code).where(TwoFactor.expires_at > now)
    ).scalars().all()
    return set(rows)


def generate_unique_two_factor_code(db: Session) -> str:
    active_codes = get_active_two_factor_codes(db)

    max_retries = 1000
    for _ in range(max_retries):
        code = f"{random.randint(0, 999999):06d}"
        if code not in active_codes:
            return code

    raise Exception("Failed to generate a unique two-factor code after multiple attempts.")


def generate_two_factor(user_id: UUID, duration_seconds, db: Session):
    expire_two_factor(user_id, db)
    code = generate_unique_two_factor_code(db)
    created_at = datetime.datetime.now()
    expires_at = created_at + datetime.timedelta(seconds=duration_seconds)

    two_factor = TwoFactor(
        user_id=user_id,
        code=code,
        expires_at=expires_at,
        created_at=created_at,
    )
    db.add(two_factor)
    db.commit()
    db.refresh(two_factor)

    return two_factor


def validate_two_factor(user_id: UUID, code: str, db: Session) -> bool:
    two_factor = db.execute(
        select(TwoFactor).where(
            TwoFactor.user_id == user_id,
            TwoFactor.code == code,
        )
    ).scalars().first()

    if two_factor and two_factor.expires_at > datetime.datetime.now():
        db.delete(two_factor)
        db.commit()
        return True

    return False


def expire_two_factor(user_id: UUID, db: Session):
    db.execute(delete(TwoFactor).where(TwoFactor.user_id == user_id))
    db.commit()


def can_resend_two_factor_code(user_id: UUID, db: Session) -> bool:
    now = datetime.datetime.now()
    recent_code = db.execute(
        select(TwoFactor)
        .where(TwoFactor.user_id == user_id)
        .order_by(TwoFactor.created_at.desc())
    ).scalars().first()

    if recent_code and (now - recent_code.created_at).total_seconds() < 60:
        return False

    return True


def send_two_factor_code_email(code: str, email, mail: EmailService, background_tasks: BackgroundTasks):

    message = f"""
        <html>
            <h1>Here's your Two Factor Code:</h1>
            <span>{code}</span>
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
    pass


async def delete_expired_two_factors(db: Session):
    now = datetime.datetime.now()
    db.execute(delete(TwoFactor).where(TwoFactor.expires_at < now))
    db.commit()
