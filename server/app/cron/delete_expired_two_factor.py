import asyncio

from fastapi_utilities import repeat_at
from sqlalchemy.orm import Session

from app.core.logs import get_logger
from app.use_cases.auth.two_factor import delete_expired_two_factors


# This is a cron job that runs every hour
@repeat_at(cron='0 * * * *', logger=get_logger())
def delete_expired_two_factors_cron(db: Session):
    logger = get_logger()
    logger.info("Clearing two-factor emails")
    asyncio.run(delete_expired_two_factors(db))
