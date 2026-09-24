from typing import Optional

from app.core.logs import get_logger
from app.core.startup import abort_startup, format_connection_error

from .repository import CacheRepository


class CacheService:
    def __init__(self, repository: CacheRepository):
        self.repository = repository

    async def get_key(self, key: str) -> Optional[str]:
        return self.repository.get_key(key)

    async def set_key(self, key: str, key_data: str, ttl: int | None) -> None:
        return self.repository.set_key(key, key_data, ttl)

    async def delete_key(self, key: str) -> None:
        return self.repository.delete_key(key)

    async def delete_key_pattern(self, pattern: str) -> None:
        return self.repository.delete_key_pattern(pattern)

    async def clear(self) -> None:
        self.repository.clear()

    async def test_connection(self) -> None:
        logger = get_logger()
        test_connection = getattr(self.repository, 'test_connection', None)

        if test_connection is None:
            logger.info('In-memory cache in use — skipping connection check')
            return

        try:
            test_connection()
        except Exception as e:
            abort_startup(format_connection_error('cache', e))

        logger.info('Cache connection successful')

