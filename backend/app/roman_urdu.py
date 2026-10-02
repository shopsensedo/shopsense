"""Roman Urdu keyword mapper (Phase 2: dictionary-based).

Normalizes a Roman Urdu / informal query into English keywords that can be
matched against the product catalog. Later phases replace this with an
NLP-based mapper per the project proposal.

Dictionary is mirrored from the frontend: shopsense/src/data/roman_urdu_map.json.
Matching: longest multi-word phrase first, then whole-word match (word
boundaries — so "ac"/"tv" don't fire inside "black"/"watch"), then raw
passthrough for unknown words (handles mixed Roman Urdu + English).
"""

import json
import re
from pathlib import Path

_MAP_PATH = Path(__file__).resolve().parent.parent / "data" / "roman_urdu_map.json"
_STOPWORDS_PATH = Path(__file__).resolve().parent.parent / "data" / "stopwords.json"


def _load_map() -> dict:
    with open(_MAP_PATH, encoding="utf-8") as f:
        data = json.load(f)
    data.pop("_note", None)
    return data


def _load_stopwords() -> set:
    try:
        with open(_STOPWORDS_PATH, encoding="utf-8") as f:
            return set(json.load(f)["words"])
    except (OSError, KeyError, ValueError):
        return set()


_MAP = _load_map()
_STOPWORDS = _load_stopwords()

# Price-intent words are NOT search keywords: they are stripped from the
# mapped query and instead set the result sort order (see detect_price_intent).
# Discount/sale are stripped but change nothing.
_PRICE_ASC = {
    "sasta", "saste", "sastay", "sasti", "cheap", "cheapest", "affordable",
}
_PRICE_DESC = {"mehnga", "mehanga", "mehngay", "expensive"}
_PRICE_NEUTRAL = {"discount", "sale"}


def is_price_word(token: str) -> bool:
    return token in _PRICE_ASC or token in _PRICE_DESC or token in _PRICE_NEUTRAL


def detect_price_intent(raw_tokens: list) -> str | None:
    """'sasta mobile' -> 'asc', 'mehnga watch' -> 'desc', else None."""
    toks = [t.lower() for t in raw_tokens]
    if any(t in _PRICE_DESC for t in toks):
        return "desc"
    if any(t in _PRICE_ASC for t in toks):
        return "asc"
    return None


def normalize_query(query: str) -> list[str]:
    """Map a Roman Urdu query to English keywords.

    Longest-phrase match first (so 'kala joota' wins over 'joota'), then
    single-word matches with word boundaries. Returns a de-duplicated
    keyword list; falls back to the raw lowercased words when nothing matches.
    """
    # Strip filler/stopwords AND price-intent words first
    # ("sasta smartwatch dikhao" -> "smartwatch").
    tokens = [t for t in re.sub(r"\s+", " ", query.strip().lower()).split(" ") if t]
    tokens = [t for t in tokens if t not in _STOPWORDS and not is_price_word(t)]
    q = " " + " ".join(tokens) + " "
    if not q.strip():
        return []

    keywords: list[str] = []

    def push(kws: list[str]) -> None:
        for kw in kws:
            if kw not in keywords:
                keywords.append(kw)

    # Phrase match: longest keys first, word-boundary safe
    for phrase in sorted((k for k in _MAP if " " in k), key=len, reverse=True):
        if f" {phrase} " in q:
            push(_MAP[phrase])
            q = q.replace(phrase, " ")

    # Single-word fallback for anything unmatched
    for word in q.split():
        if word in _MAP:
            push(_MAP[word])
        elif word not in keywords:
            keywords.append(word)

    return keywords
