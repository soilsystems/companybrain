from __future__ import annotations

from app.services.files.mime_registry import normalize_mime_type


class DocumentAIAdapter:
    SUPPORTED_MIME_TYPES = frozenset(
        {"application/pdf", "image/jpeg", "image/png", "image/tiff", "image/webp"}
    )

    def supports(self, mime_type: str) -> bool:
        return normalize_mime_type(mime_type) in self.SUPPORTED_MIME_TYPES

    def validate(self, mime_type: str) -> str:
        canonical = normalize_mime_type(mime_type)
        if canonical not in self.SUPPORTED_MIME_TYPES:
            raise ValueError("provider_unsupported_mime")
        return canonical
