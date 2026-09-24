import re

from app.services.text_processor.repository import TextProcessorRepository

from .filters.generic_words import GENERIC_WORDS_BY_LANGUAGE
from .filters.invalid import is_invalid_token
from .filters.numbers import is_isolated_number, is_significant_number_token
from .filters.pos import passes_pos_filter
from .filters.stopwords import STOPWORDS_BY_LANGUAGE
from .lemmatize import lemmatize_token
from .ngrams import CONNECTORS, AnnotatedToken, build_ngram_candidates
from .normalize import normalize_text
from .score import deduplicate_keywords

_TOKEN_PATTERN = re.compile(r"[a-z0-9]+(?:[./:-][a-z0-9]+)*")
_DEFAULT_LIMIT = 15
_MIN_TOKEN_LENGTH = 3
_MAX_TOKEN_LENGTH = 30


class LocalTextProcessorRepository(TextProcessorRepository):
    def extract_keywords(self, text: str, language: str, *, limit: int = _DEFAULT_LIMIT) -> list[str]:
        normalized_language = self._normalize_language(language)
        stopwords = self._resolve_set(STOPWORDS_BY_LANGUAGE, normalized_language)
        generics = self._resolve_set(GENERIC_WORDS_BY_LANGUAGE, normalized_language)

        cleaned = normalize_text(text)
        raw_tokens = _TOKEN_PATTERN.findall(cleaned)
        annotated = [
            token
            for token in (
                self._annotate_token(raw, normalized_language, stopwords, generics)
                for raw in raw_tokens
            )
            if token is not None
        ]

        if not annotated:
            return []

        candidates = build_ngram_candidates(annotated)
        if not candidates:
            return []

        return deduplicate_keywords(candidates, limit=max(limit, 1))

    def _annotate_token(
        self,
        surface: str,
        language: str,
        stopwords: frozenset[str],
        generics: frozenset[str],
    ) -> AnnotatedToken | None:
        is_connector = surface in CONNECTORS
        is_stop = surface in stopwords
        is_code = is_significant_number_token(surface)

        # Mantém stopwords/conectores curtos como separadores de n-grams.
        if (
            not is_connector
            and not is_stop
            and (len(surface) < _MIN_TOKEN_LENGTH or len(surface) > _MAX_TOKEN_LENGTH)
        ):
            return None
        if len(surface) > _MAX_TOKEN_LENGTH:
            return None
        if is_isolated_number(surface):
            return None
        if not is_code and not is_stop and not is_connector and is_invalid_token(surface):
            return None

        is_stop = is_stop and not is_code
        is_generic = surface in generics
        lemma = surface if is_code else lemmatize_token(surface, language)

        if is_code:
            is_content = True
        elif is_stop or is_connector:
            is_content = False
        elif is_generic:
            is_content = True
        else:
            is_content = passes_pos_filter(surface, lemma)

        return {
            "surface": surface,
            "lemma": lemma,
            "is_stopword": is_stop,
            "is_connector": is_connector,
            "is_generic": is_generic,
            "is_content": is_content,
            "is_significant_code": is_code,
        }

    def _normalize_language(self, language: str) -> str:
        normalized = (language or "pt-BR").strip().lower().replace("_", "-")
        if normalized in STOPWORDS_BY_LANGUAGE:
            return normalized
        primary = normalized.split("-")[0]
        if primary in STOPWORDS_BY_LANGUAGE:
            return primary
        return "pt"

    def _resolve_set(self, mapping: dict[str, frozenset[str]], language: str) -> frozenset[str]:
        if language in mapping:
            return mapping[language]
        primary = language.split("-")[0]
        return mapping.get(primary, mapping["pt"])
