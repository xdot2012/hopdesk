from fastapi_utilities import repeat_at

from app.core.database import SessionLocal
from app.core.logs import get_logger
from app.use_cases.sla.refresh_overdue_slas import (
    refresh_overdue_slas,
)


@repeat_at(cron='* * * * *', logger=get_logger())
def refresh_sla_status_cron():
    logger = get_logger()
    with SessionLocal() as db:
        count = refresh_overdue_slas(db)
        if count:
            logger.info("Marked %s tickets as SLA failed", count)
