from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class FileCategory(StrEnum):
    image = "image"
    pdf = "pdf"
    word = "word"
    spreadsheet = "spreadsheet"
    presentation = "presentation"
    text = "text"
    structured_text = "structured_text"
    unsafe = "unsafe"
    unknown = "unknown"


class Processor(StrEnum):
    image_normalizer = "image_normalizer"
    document_ai = "google_document_ai"
    gemini_vision = "gemini_vision"
    pdf_parser = "pdf_parser"
    docx_parser = "docx_parser"
    spreadsheet_parser = "spreadsheet_parser"
    text_parser = "text_parser"
    json_parser = "json_parser"
    pptx_parser = "pptx_parser"
    reject = "reject"


@dataclass(frozen=True)
class MimeDefinition:
    mime_type: str
    extensions: frozenset[str]
    category: FileCategory
    processor: Processor
    max_bytes: int
    ocr_required: bool = False
    direct_ai_vision: bool = False
    conversion_target: str | None = None


MIB = 1024 * 1024
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

MIME_REGISTRY: dict[str, MimeDefinition] = {
    "application/pdf": MimeDefinition(
        "application/pdf",
        frozenset({".pdf"}),
        FileCategory.pdf,
        Processor.pdf_parser,
        50 * MIB,
    ),
    "image/jpeg": MimeDefinition(
        "image/jpeg",
        frozenset({".jpg", ".jpeg"}),
        FileCategory.image,
        Processor.image_normalizer,
        25 * MIB,
        True,
        True,
    ),
    "image/png": MimeDefinition(
        "image/png",
        frozenset({".png"}),
        FileCategory.image,
        Processor.image_normalizer,
        25 * MIB,
        True,
        True,
    ),
    "image/webp": MimeDefinition(
        "image/webp",
        frozenset({".webp"}),
        FileCategory.image,
        Processor.image_normalizer,
        25 * MIB,
        True,
        True,
    ),
    "image/tiff": MimeDefinition(
        "image/tiff",
        frozenset({".tif", ".tiff"}),
        FileCategory.image,
        Processor.image_normalizer,
        25 * MIB,
        True,
        False,
        "image/png",
    ),
    DOCX_MIME: MimeDefinition(
        DOCX_MIME,
        frozenset({".docx"}),
        FileCategory.word,
        Processor.docx_parser,
        25 * MIB,
    ),
    XLSX_MIME: MimeDefinition(
        XLSX_MIME,
        frozenset({".xlsx"}),
        FileCategory.spreadsheet,
        Processor.spreadsheet_parser,
        25 * MIB,
    ),
    "application/vnd.ms-excel": MimeDefinition(
        "application/vnd.ms-excel",
        frozenset({".xls"}),
        FileCategory.spreadsheet,
        Processor.spreadsheet_parser,
        25 * MIB,
    ),
    "text/csv": MimeDefinition(
        "text/csv",
        frozenset({".csv"}),
        FileCategory.spreadsheet,
        Processor.spreadsheet_parser,
        10 * MIB,
    ),
    "text/plain": MimeDefinition(
        "text/plain",
        frozenset({".txt"}),
        FileCategory.text,
        Processor.text_parser,
        10 * MIB,
    ),
    "application/json": MimeDefinition(
        "application/json",
        frozenset({".json"}),
        FileCategory.structured_text,
        Processor.json_parser,
        10 * MIB,
    ),
    PPTX_MIME: MimeDefinition(
        PPTX_MIME,
        frozenset({".pptx"}),
        FileCategory.presentation,
        Processor.pptx_parser,
        50 * MIB,
    ),
}

MIME_ALIASES = {
    "image/jpg": "image/jpeg",
    "image/pjpeg": "image/jpeg",
    "image/x-png": "image/png",
    "image/x-tiff": "image/tiff",
    "application/x-pdf": "application/pdf",
    "application/acrobat": "application/pdf",
    "text/x-csv": "text/csv",
    "application/csv": "text/csv",
    "application/vnd.ms-office": "application/vnd.ms-excel",
    "application/x-excel": "application/vnd.ms-excel",
    "application/msexcel": "application/vnd.ms-excel",
}


def normalize_mime_type(value: str | None) -> str:
    if not value:
        return "application/octet-stream"
    normalized = value.split(";", 1)[0].strip().lower()
    return MIME_ALIASES.get(normalized, normalized)


def definition_for(mime_type: str) -> MimeDefinition | None:
    return MIME_REGISTRY.get(normalize_mime_type(mime_type))
