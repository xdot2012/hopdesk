from functools import lru_cache

from .service import HashService
from .repository import PasslibRepository


@lru_cache
def get_hash_service() -> HashService:
    return HashService(PasslibRepository(schemes=["bcrypt"]))

