from __future__ import annotations

from app.services.files.mime_registry import normalize_mime_type


class OpenAIAdapter:
    """Capability declaration; extraction does not depend on OpenAI."""

    DIRECT_MIME_TYPES = frozenset(
        {"application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"}
    )

    def supports(self, mime_type: str) -> bool:
        return normalize_mime_type(mime_type) in self.DIRECT_MIME_TYPES
