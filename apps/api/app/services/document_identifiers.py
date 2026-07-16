from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

NORMALIZATION_VERSION = 1
_SLASH_VARIANTS = str.maketrans({"／": "/", "⁄": "/", "∕": "/"})
_SURVEY_QUERY = re.compile(
    r"(?:survey(?:\s+(?:number|no\.?))?\s*)?([0-9]+(?:\s*[/／⁄∕-]\s*[0-9A-Za-z]+)?)",
    re.IGNORECASE,
)


def normalize_identifier(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).translate(_SLASH_VARIANTS)
    normalized = re.sub(r"\s*/\s*", "/", normalized.strip())
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.casefold()


@dataclass(frozen=True)
class ParsedSurveyQuery:
    original: str
    normalized: str


def parse_survey_query(value: str) -> ParsedSurveyQuery | None:
    match = _SURVEY_QUERY.search(value)
    if not match:
        return None
    original = match.group(1).strip()
    return ParsedSurveyQuery(
        original=original, normalized=normalize_identifier(original)
    )
