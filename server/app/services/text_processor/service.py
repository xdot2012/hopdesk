from .repository import TextProcessorRepository

_DEFAULT_LIMIT = 15


class TextProcessorService:
    def __init__(self, repository: TextProcessorRepository):
        self.repository = repository

    def extract_keywords(
        self,
        text: str,
        language: str = "pt-BR",
        *,
        limit: int = _DEFAULT_LIMIT,
    ) -> list[str]:
        if not text or not text.strip():
            raise ValueError("O texto não pode estar vazio.")

        return self.repository.extract_keywords(text, language, limit=limit)
