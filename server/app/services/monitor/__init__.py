from functools import lru_cache
from .service import MonitorService
from .repository import SentryRepository, MonitorRepository

monitor_service: MonitorService | None = None


def start_monitor_service(environment: str, use_sentry: bool, dsn: str, profiles_sample: float = 1, traces_sample: float = 1):
    if use_sentry:
        return MonitorService(
            SentryRepository(
                environment=environment,
                dsn=dsn,
                profiles_sample=profiles_sample,
                traces_sample_rate=traces_sample
            )
        )
    else:
        return MonitorService(MonitorRepository())


@lru_cache
def get_monitor_service() -> MonitorService:
    return monitor_service
