from __future__ import annotations

from dataclasses import dataclass

from app.services.files.errors import IngestionError, user_error
from app.services.files.mime_registry import normalize_mime_type


@dataclass(frozen=True)
class GeminiInput:
    part_type: str
    data: bytes
    mime_type: str


class GeminiAdapter:
    """Capability boundary for Gemini; transport is intentionally separate."""

    IMAGE_MIME_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
    DOCUMENT_MIME_TYPES = frozenset({"application/pdf"})

    def supports(self, mime_type: str) -> bool:
        canonical = normalize_mime_type(mime_type)
        return canonical in self.IMAGE_MIME_TYPES | self.DOCUMENT_MIME_TYPES

    def prepare_inline_input(self, data: bytes, mime_type: str) -> GeminiInput:
        canonical = normalize_mime_type(mime_type)
        if canonical in self.IMAGE_MIME_TYPES:
            return GeminiInput("image", data, canonical)
        if canonical in self.DOCUMENT_MIME_TYPES:
            return GeminiInput("document", data, canonical)
        raise UnsupportedProviderInput(user_error("provider_unsupported_mime"))

    def map_error(self, status_code: int, provider_message: str) -> IngestionError:
        lowered = provider_message.lower()
        if "unsupported mime" in lowered or status_code == 415:
            return user_error("provider_unsupported_mime")
        return user_error("processing_failed")


class UnsupportedProviderInput(ValueError):
    def __init__(self, error: IngestionError) -> None:
        super().__init__(error.code)
        self.error = error
