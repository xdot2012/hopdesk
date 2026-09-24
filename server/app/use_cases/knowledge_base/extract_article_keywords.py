from app.services.text_processor.service import TextProcessorService
from app.use_cases.knowledge_base.sanitize_article_html import strip_html_to_text

_ARTICLE_KEYWORD_LIMIT = 20


def build_article_keyword_source(title: str, body: str) -> str:
    # Repete o título para aumentar relevância no ranking.
    clean_title = (title or "").strip()
    clean_body = strip_html_to_text(body or "")
    return f"{clean_title}\n{clean_title}\n{clean_body}".strip()


def extract_article_keywords(
    title: str,
    body: str,
    text_processor: TextProcessorService,
    *,
    language: str = "pt-BR",
) -> list[str]:
    source = build_article_keyword_source(title, body)
    if not source:
        return []
    return text_processor.extract_keywords(source, language, limit=_ARTICLE_KEYWORD_LIMIT)
