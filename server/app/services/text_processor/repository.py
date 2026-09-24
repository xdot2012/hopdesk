from abc import abstractmethod


class TextProcessorRepository:
    @abstractmethod
    def extract_keywords(self, text: str, language: str, *, limit: int = 15) -> list[str]:
        raise NotImplementedError
