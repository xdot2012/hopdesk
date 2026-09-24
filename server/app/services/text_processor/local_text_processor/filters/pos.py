"""Heurísticas de classe gramatical sem dependência de NLP externo."""

_ADVERB_SUFFIXES = ("mente", "ly")

_VERB_LIKE_LEMMAS = frozenset(
    {
        "ser",
        "estar",
        "ter",
        "haver",
        "fazer",
        "ir",
        "vir",
        "poder",
        "dever",
        "querer",
        "saber",
        "dizer",
        "falar",
        "ficar",
        "dar",
        "ver",
        "pedir",
        "precisar",
        "conseguir",
        "tentar",
        "usar",
        "gerar",
        "be",
        "have",
        "do",
        "get",
        "make",
        "go",
        "come",
        "want",
        "need",
        "try",
        "use",
        "say",
        "tell",
        "fail",
        "generate",
    }
)

_NOUN_LIKE_SUFFIXES = (
    "cao",
    "sao",
    "mento",
    "idade",
    "encia",
    "ancia",
    "ismo",
    "ista",
    "agem",
    "orio",
    "oria",
    "avel",
    "ivel",
    "ional",
    "tion",
    "sion",
    "ment",
    "ness",
    "ity",
    "ence",
    "ance",
)

_WEAK_ADJECTIVES = frozenset(
    {
        "novo",
        "nova",
        "novos",
        "novas",
        "bom",
        "boa",
        "ruim",
        "grande",
        "pequeno",
        "pequena",
        "aprovado",
        "aprovada",
        "aprovados",
        "aprovadas",
        "detalhado",
        "detalhada",
        "detalhados",
        "detalhadas",
        "recorrente",
        "recorrentes",
        "pendente",
        "pendentes",
        "new",
        "good",
        "bad",
        "big",
        "small",
        "approved",
        "pending",
        "detailed",
        "recurring",
    }
)

_WEAK_MODIFIER_SUFFIXES = (
    "ente",
    "ante",
)



def is_adverb(token: str) -> bool:
    return any(token.endswith(suffix) and len(token) > len(suffix) + 2 for suffix in _ADVERB_SUFFIXES)


def is_weak_verb(lemma: str) -> bool:
    return lemma in _VERB_LIKE_LEMMAS


def is_noun_like(token: str) -> bool:
    return any(token.endswith(suffix) for suffix in _NOUN_LIKE_SUFFIXES)


def is_weak_modifier(token: str) -> bool:
    if token in _WEAK_ADJECTIVES:
        return True
    if is_noun_like(token):
        return False
    return any(token.endswith(suffix) and len(token) > len(suffix) + 2 for suffix in _WEAK_MODIFIER_SUFFIXES)


def passes_pos_filter(token: str, lemma: str) -> bool:
    if is_adverb(token):
        return False
    if is_weak_verb(lemma):
        return False
    if is_weak_modifier(token) or is_weak_modifier(lemma):
        return False
    # Verbos flexionados comuns (ex.: solicitou → solicitar / failed → fail).
    if lemma.endswith(("ar", "er", "ir")) and token != lemma and not is_noun_like(token):
        if token.endswith(("ou", "ei", "am", "ava", "ando", "endo", "indo")):
            return False
    if token.endswith(("ed", "ing")) and not is_noun_like(token) and token != lemma:
        return False
    return True
