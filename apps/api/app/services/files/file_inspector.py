from __future__ import annotations

import hashlib
import io
import json
import re
import unicodedata
import zipfile
from dataclasses import dataclass
from pathlib import PurePath

from app.services.files.mime_registry import (
    DOCX_MIME,
    PPTX_MIME,
    XLSX_MIME,
    FileCategory,
    MimeDefinition,
    Processor,
    definition_for,
    normalize_mime_type,
)

EXECUTABLE_EXTENSIONS = {
    ".app",
    ".bat",
    ".cmd",
    ".com",
    ".dll",
    ".dmg",
    ".exe",
    ".jar",
    ".js",
    ".msi",
    ".ps1",
    ".scr",
    ".sh",
    ".vbs",
}
MACRO_EXTENSIONS = {".docm", ".dotm", ".xlsm", ".xltm", ".pptm", ".potm"}


@dataclass(frozen=True)
class InspectedFile:
    original_filename: str
    safe_filename: str
    browser_mime_type: str
    detected_mime_type: str
    normalized_mime_type: str
    category: FileCategory
    extension: str
    size: int
    checksum_sha256: str
    extension_matches: bool
    safe_to_process: bool
    conversion_required: bool
    preferred_processor: Processor
    fallback_processor: Processor | None
    error_code: str | None = None


def safe_display_filename(filename: str) -> str:
    name = PurePath(filename.replace("\\", "/")).name
    name = unicodedata.normalize("NFC", name).replace("\x00", "")
    name = re.sub(r"[\r\n\t]", " ", name).strip(" .")
    return name[:240] or "uploaded-file"


class FileInspector:
    def inspect(
        self, content: bytes, filename: str, browser_mime_type: str | None = None
    ) -> InspectedFile:
        safe_name = safe_display_filename(filename)
        extension = PurePath(safe_name).suffix.lower()
        browser_mime = normalize_mime_type(browser_mime_type)
        checksum = hashlib.sha256(content).hexdigest()

        detected, error_code = self._detect(content, extension)
        definition = definition_for(detected)
        if not content:
            error_code = "empty_file"
        elif extension in EXECUTABLE_EXTENSIONS or extension in MACRO_EXTENSIONS:
            error_code = "unsafe_file"
        elif self._is_executable(content):
            error_code = "unsafe_file"
        elif self._is_encrypted(content, detected):
            error_code = "encrypted_file"
        elif definition and len(content) > definition.max_bytes:
            error_code = "file_too_large"
        elif definition is None and error_code is None:
            error_code = "unsupported_file"

        category = definition.category if definition else FileCategory.unknown
        processor = definition.processor if definition else Processor.reject
        matches = bool(definition and extension in definition.extensions)
        fallback = self._fallback(definition)
        return InspectedFile(
            original_filename=filename,
            safe_filename=safe_name,
            browser_mime_type=browser_mime,
            detected_mime_type=detected,
            normalized_mime_type=normalize_mime_type(detected),
            category=category,
            extension=extension,
            size=len(content),
            checksum_sha256=checksum,
            extension_matches=matches,
            safe_to_process=error_code is None,
            conversion_required=bool(definition and definition.conversion_target),
            preferred_processor=processor,
            fallback_processor=fallback,
            error_code=error_code,
        )

    def _detect(self, content: bytes, extension: str) -> tuple[str, str | None]:
        if not content:
            return "application/octet-stream", "empty_file"
        if content.startswith(b"%PDF-"):
            return "application/pdf", None
        if content.startswith(b"\xff\xd8\xff"):
            return "image/jpeg", None
        if content.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png", None
        if content[:4] in {b"II*\x00", b"MM\x00*"}:
            return "image/tiff", None
        if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
            return "image/webp", None
        if content.startswith(b"PK\x03\x04"):
            return self._detect_zip(content)
        if content.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
            return "application/vnd.ms-excel", None
        if self._is_executable(content):
            return "application/x-executable", "unsafe_file"
        return self._detect_text(content, extension)

    def _detect_zip(self, content: bytes) -> tuple[str, str | None]:
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                names = set(archive.namelist())
                if any(name.startswith("word/") for name in names):
                    return DOCX_MIME, None
                if any(name.startswith("xl/") for name in names):
                    return XLSX_MIME, None
                if any(name.startswith("ppt/") for name in names):
                    return PPTX_MIME, None
        except (zipfile.BadZipFile, OSError):
            return "application/zip", "corrupt_file"
        return "application/zip", "unsupported_file"

    def _detect_text(self, content: bytes, extension: str) -> tuple[str, str | None]:
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            return "application/octet-stream", "unsupported_file"
        if "\x00" in text:
            return "application/octet-stream", "corrupt_file"
        stripped = text.strip()
        if extension == ".json" or stripped.startswith(("{", "[")):
            try:
                json.loads(stripped)
                return "application/json", None
            except json.JSONDecodeError:
                if extension == ".json":
                    return "application/json", "corrupt_file"
        lines = [line for line in text.splitlines() if line.strip()][:8]
        if extension == ".csv" or self._looks_like_csv(lines):
            return "text/csv", None
        if stripped or extension == ".txt":
            return "text/plain", None
        return "application/octet-stream", "empty_file"

    @staticmethod
    def _looks_like_csv(lines: list[str]) -> bool:
        if len(lines) < 2:
            return False
        counts = [line.count(",") for line in lines]
        return counts[0] > 0 and len(set(counts)) == 1

    @staticmethod
    def _is_executable(content: bytes) -> bool:
        return content.startswith((b"MZ", b"\x7fELF", b"\xca\xfe\xba\xbe"))

    @staticmethod
    def _is_encrypted(content: bytes, mime_type: str) -> bool:
        if mime_type == "application/pdf" and b"/Encrypt" in content[-65536:]:
            return True
        return b"EncryptedPackage" in content[:262144]

    @staticmethod
    def _fallback(definition: MimeDefinition | None) -> Processor | None:
        if definition is None:
            return None
        if definition.category == FileCategory.pdf:
            return Processor.document_ai
        if definition.category == FileCategory.image:
            return Processor.document_ai
        return None
