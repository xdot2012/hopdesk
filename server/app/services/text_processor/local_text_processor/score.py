from typing import TypedDict


class ScoredKeyword(TypedDict):
    term: str
    score: float
    frequency: int
    size: int


def score_candidate(
    *,
    frequency: int,
    size: int,
    has_generic: bool,
    noun_like: bool,
    is_significant_code: bool,
) -> float:
    score = float(frequency) * 2

    if frequency > 1:
        score += 2
    if size == 2:
        score += 2
    if size >= 3:
        score += 3
    if noun_like:
        score += 3
    if is_significant_code:
        score += 3
    if has_generic:
        score -= 3

    return score


def deduplicate_keywords(candidates: list[ScoredKeyword], limit: int) -> list[str]:
    """Prefere termos com maior score e remove unigramas cobertos por n-grams melhores."""
    ordered = sorted(
        candidates,
        key=lambda item: (item["score"], item["size"], item["frequency"], item["term"]),
        reverse=True,
    )

    selected: list[ScoredKeyword] = []
    selected_terms: list[str] = []

    for candidate in ordered:
        if any(_is_redundant(candidate["term"], chosen["term"]) for chosen in selected):
            continue

        selected.append(candidate)
        selected_terms.append(candidate["term"])
        if len(selected_terms) >= limit:
            break

    return selected_terms


def _is_redundant(candidate: str, chosen: str) -> bool:
    if candidate == chosen:
        return True

    candidate_parts = candidate.split()
    chosen_parts = chosen.split()

    # Unigrama já coberto por n-gram selecionado.
    if len(candidate_parts) == 1 and candidate in chosen_parts and len(chosen_parts) > 1:
        return True

    # N-gram menor coberto por n-gram maior.
    if len(candidate_parts) > 1 and len(chosen_parts) > len(candidate_parts):
        candidate_span = f" {candidate} "
        chosen_span = f" {chosen} "
        if candidate_span in chosen_span:
            return True

    return False
