import json

from redis import Redis

from ..repository import CacheRepository
from .encoder import RedisEncoder


class RedisCacheRepository(CacheRepository):
    DATETIME_FORMAT = "%Y/%m/%d %H:%M:%S"

    def __init__(self, host: str, port: int) -> None:
        super().__init__()
        self.host = host
        self.port = port

    def get_redis_session(self) -> Redis:
        return Redis(host=self.host, port=self.port, decode_responses=True)

    def test_connection(self) -> None:
        rd = self.get_redis_session()
        rd.ping()
        rd.close()

    def get_key(self, key: str) -> dict:
        rd = self.get_redis_session()
        data = rd.get(str(key))
        rd.close()
        return json.loads(data) if data else None

    def set_key(self, key: str, data: str, ttl: int | None) -> bool:
        rd = self.get_redis_session()
        response = rd.set(str(key), json.dumps(data, cls=RedisEncoder), ex=ttl)
        rd.close()
        return bool(response)

    def clear(self):
        rd = self.get_redis_session()
        for key in rd.keys():
            rd.delete(key)
        return

    def delete_key(self, key: str):
        rd = self.get_redis_session()
        rd.delete(key)
        rd.close()
        return

    def delete_key_pattern(self, pattern: str) -> None:
        rd = self.get_redis_session()
        keys = rd.keys(pattern)
        if keys:
            rd.delete(*keys)
        rd.close()
