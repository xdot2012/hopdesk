from abc import abstractmethod
from typing import Optional

class CacheRepository:
    def __init__(self) -> None:
        pass

    @abstractmethod
    def get_key(self, key: str) -> Optional[str]:
        pass

    @abstractmethod
    def set_key(self, key: str, key_data: str, ttl: int | None) -> None:
        pass

    @abstractmethod
    def delete_key(self, key: str) -> None:
        pass

    @abstractmethod
    def clear(self) -> None:
        pass

    @abstractmethod
    def delete_key_pattern(self, pattern: str) -> None:
        pass
