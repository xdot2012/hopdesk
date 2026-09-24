from fastapi_utilities import repeat_at
from app.core.logs import get_logger


# This is a cron job that runs every day at 5 PM
@repeat_at(cron='39 19 * * *', logger=get_logger())
def example_cron():
    logger = get_logger()
    logger.info("Example is running")