from sqlalchemy.orm import Session

from app.core.logs import get_logger
from app.cron.delete_expired_two_factor import delete_expired_two_factors_cron
from app.cron.example import example_cron
from app.cron.refresh_sla_status import refresh_sla_status_cron
from app.settings import Settings


async def start_cron_jobs(settings: Settings, db: Session):
    logger = get_logger()
    example_cron()
    delete_expired_two_factors_cron(db)
    refresh_sla_status_cron()

    logger.info('Cron jobs started')
