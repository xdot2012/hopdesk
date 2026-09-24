from .cache import get_cache_service
from functools import wraps

from sqlalchemy.orm.session import Session

USER_PROFILE_CACHE_PREFIX = "user_profile_v5"
USER_PROFILE_CACHE_PATTERN = f"{USER_PROFILE_CACHE_PREFIX}*"


def get_cache_key(resource_key: str, *args, **kwargs):
    all_args = [str(arg) for arg in args if not isinstance(arg, Session)]
    all_args.extend(
        str(value)
        for value in kwargs.values()
        if not isinstance(value, Session) and value is not None
    )

    return f"{resource_key}({','.join(all_args)})"


async def invalidate_user_profile_cache(user_id) -> None:
    cache_service = get_cache_service()
    await cache_service.delete_key(get_cache_key(USER_PROFILE_CACHE_PREFIX, user_id))
    await cache_service.delete_key_pattern(USER_PROFILE_CACHE_PATTERN)


def cached_database_resource(resource_key: str, expire_in_seconds: int | None = 900):
    def decorator(func):
        cache_service = get_cache_service()

        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = get_cache_key(resource_key, *args, **kwargs)

            cached_result = await cache_service.get_key(key)
            if cached_result:
                return cached_result

            result = await func(*args, **kwargs)
            await cache_service.set_key(key, result, expire_in_seconds)
            return result

        return wrapper

    return decorator


def update_cache_resource(resource_key: str, expire_in_seconds: int | None = 900):
    def decorator(func):
        cache_service = get_cache_service()

        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            key = get_cache_key(resource_key, *args, **kwargs)
            await cache_service.set_key(key, result, expire_in_seconds)

            return result
        return wrapper
    return decorator
