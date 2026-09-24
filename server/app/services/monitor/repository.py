import sentry_sdk

from app.core.logs import get_logger


class MonitorRepository():

    def log_info(self, data: str) -> None:
        return

    def capture_exception(self, exception: Exception) -> None:
        logger = get_logger()
        logger.error(exception)
        return


class SentryRepository(MonitorRepository):
    def __init__(self, environment: str, dsn: str, profiles_sample: float, traces_sample_rate: float):
        sentry_sdk.init(
            environment=environment,
            dsn=dsn,
            # Set traces_sample_rate to 1.0 to capture 100%
            # of transactions for performance monitoring.
            traces_sample_rate=traces_sample_rate,
            # Set profiles_sample_rate to 1.0 to profile 100%
            # of sampled transactions.
            # We recommend adjusting this value in production.
            profiles_sample_rate=profiles_sample,
        )

    def capture_exception(self, exception: Exception) -> None:
        sentry_sdk.capture_exception(exception)

    def log_info(self, data: str) -> None:
        logger = get_logger()
        logger.info(data)