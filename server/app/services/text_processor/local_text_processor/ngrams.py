from collections import Counter
from typing import TypedDict

from .filters.pos import is_noun_like, is_weak_modifier
from .score import ScoredKeyword, score_candidate


class AnnotatedToken(TypedDict):
    surface: str
    lemma: str
    is_stopword: bool
    is_connector: bool
    is_generic: bool
    is_content: bool
    is_significant_code: bool


CONNECTORS = frozenset(
    {
        "de",
        "do",
        "da",
        "dos",
        "das",
        "of",
    }
)


def build_ngram_candidates(
    tokens: list[AnnotatedToken],
    *,
    max_n: int = 3,
) -> list[ScoredKeyword]:
    if not tokens:
        return []

    unigram_counter: Counter[str] = Counter()
    ngram_counter: Counter[str] = Counter()
    meta: dict[str, dict] = {}

    for token in tokens:
        if not token["is_content"]:
            continue
        key = token["lemma"]
        unigram_counter[key] += 1
        current = meta.get(key)
        if current is None or token["surface"] < current["surface"]:
            meta[key] = {
                "surface": token["surface"],
                "has_generic": token["is_generic"],
                "noun_like": is_noun_like(token["lemma"]) or is_noun_like(token["surface"]),
                "is_significant_code": token["is_significant_code"],
                "size": 1,
            }
        else:
            current["has_generic"] = current["has_generic"] or token["is_generic"]
            current["is_significant_code"] = (
                current["is_significant_code"] or token["is_significant_code"]
            )

    for size in range(2, max_n + 1):
        for start in range(0, len(tokens) - size + 1):
            window = tokens[start : start + size]
            phrase = _build_valid_phrase(window)
            if phrase is None:
                continue

            display, lemma_key, has_generic, noun_like, is_code = phrase
            ngram_counter[lemma_key] += 1
            current = meta.get(lemma_key)
            if current is None:
                meta[lemma_key] = {
                    "surface": display,
                    "has_generic": has_generic,
                    "noun_like": noun_like,
                    "is_significant_code": is_code,
                    "size": size,
                }
            else:
                current["has_generic"] = current["has_generic"] or has_generic
                current["noun_like"] = current["noun_like"] or noun_like
                current["is_significant_code"] = current["is_significant_code"] or is_code

    candidates: list[ScoredKeyword] = []

    for key, frequency in unigram_counter.items():
        info = meta[key]
        # Evita unigramas genéricos puros.
        if info["has_generic"] and frequency < 3:
            continue
        candidates.append(
            {
                "term": info["surface"],
                "score": score_candidate(
                    frequency=frequency,
                    size=1,
                    has_generic=info["has_generic"],
                    noun_like=info["noun_like"],
                    is_significant_code=info["is_significant_code"],
                ),
                "frequency": frequency,
                "size": 1,
            }
        )

    for key, frequency in ngram_counter.items():
        info = meta[key]
        candidates.append(
            {
                "term": info["surface"],
                "score": score_candidate(
                    frequency=frequency,
                    size=info["size"],
                    has_generic=info["has_generic"],
                    noun_like=info["noun_like"],
                    is_significant_code=info["is_significant_code"],
                ),
                "frequency": frequency,
                "size": info["size"],
            }
        )

    return candidates


def _build_valid_phrase(
    window: list[AnnotatedToken],
) -> tuple[str, str, bool, bool, bool] | None:
    if not window:
        return None

    first, last = window[0], window[-1]
    if not first["is_content"] or not last["is_content"]:
        return None

    if first["is_generic"] or last["is_generic"]:
        return None

    lemmas = [token["lemma"] for token in window if token["is_content"]]
    if len(lemmas) != len(set(lemmas)):
        return None

    middle = window[1:-1]
    if middle:
        if all(token["is_connector"] for token in middle):
            if any(
                is_weak_modifier(token["surface"]) or is_weak_modifier(token["lemma"])
                for token in (first, last)
            ):
                return None
        elif all(token["is_content"] for token in middle):
            # Conteúdo puro: apenas bigrams (trigrama só com conector no meio).
            return None
        else:
            return None
    elif len(window) == 2:
        if first["is_stopword"] or last["is_stopword"]:
            return None
        if is_weak_modifier(first["surface"]) or is_weak_modifier(last["surface"]):
            return None
        if not all(token["is_content"] for token in window):
            return None
    else:
        return None

    surfaces = [token["surface"] for token in window]
    lemma_key = " ".join(token["lemma"] for token in window)
    has_generic = any(token["is_generic"] for token in window)
    noun_like = any(
        is_noun_like(token["lemma"]) or is_noun_like(token["surface"])
        for token in window
        if token["is_content"]
    )
    is_code = any(token["is_significant_code"] for token in window)

    return " ".join(surfaces), lemma_key, has_generic, noun_like, is_code
