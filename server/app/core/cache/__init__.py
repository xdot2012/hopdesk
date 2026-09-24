from functools import lru_cache

from app.settings import get_settings
from .memory.repository import MemoryCacheRepository
from .redis.repository import RedisCacheRepository
from .service import CacheService

settings = get_settings()
if settings.use_redis:
    cache_service = CacheService(RedisCacheRepository(host=settings.cache_host, port=settings.cache_port))
else:
    cache_service = CacheService(MemoryCacheRepository())

@lru_cache()
def get_cache_service() -> CacheService:
    return cache_service
