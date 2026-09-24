import fnmatch
from typing import Any, Optional

from ..repository import CacheRepository


class MemoryCacheRepository(CacheRepository):
    def __init__(self) -> None:
        super().__init__()
        self._store: dict[str, Any] = {}

    def get_key(self, key: str) -> Optional[Any]:
        return self._store.get(key)

    def set_key(self, key: str, key_data: Any, ttl: int | None = None) -> None:
        self._store[key] = key_data

    def delete_key(self, key: str) -> None:
        self._store.pop(key, None)

    def delete_key_pattern(self, pattern: str) -> None:
        for key in list(self._store):
            if fnmatch.fnmatch(key, pattern):
                del self._store[key]

    def clear(self) -> None:
        self._store.clear()
