from functools import lru_cache

from .local_text_processor import LocalTextProcessorRepository
from .service import TextProcessorService


@lru_cache
def get_text_processor_service() -> TextProcessorService:
    repository = LocalTextProcessorRepository()
    return TextProcessorService(repository)


__all__ = ["TextProcessorService", "get_text_processor_service"]
