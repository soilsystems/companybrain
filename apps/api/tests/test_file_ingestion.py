from __future__ import annotations

import asyncio
import io
import zipfile

import pytest
from PIL import Image

from app.integrations.gemini import GeminiAdapter
from app.integrations.gemini.adapter import UnsupportedProviderInput
from app.services.files.converter import SafeImageConverter
from app.services.files.file_inspector import FileInspector, safe_display_filename
from app.services.files.mime_registry import Processor, normalize_mime_type
from app.services.files.processor_router import FileProcessorRouter


def image_bytes(format_name: str) -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (12, 8), "white").save(output, format=format_name)
    return output.getvalue()


def office_zip(prefix: str) -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types />")
        archive.writestr(f"{prefix}/document.xml", "<document />")
    return output.getvalue()


@pytest.mark.parametrize(
    ("alias", "canonical"),
    [
        ("image/jpg", "image/jpeg"),
        ("image/pjpeg", "image/jpeg"),
        ("application/x-pdf", "application/pdf"),
        ("IMAGE/JPEG; charset=binary", "image/jpeg"),
    ],
)
def test_normalizes_mime_aliases(alias: str, canonical: str) -> None:
    assert normalize_mime_type(alias) == canonical


@pytest.mark.parametrize(
    "filename", ["report.jpg", "report.jpeg", "REPORT.JPEG", "report.bin"]
)
def test_detects_jpeg_from_content(filename: str) -> None:
    inspected = FileInspector().inspect(
        image_bytes("JPEG"), filename, "application/octet-stream"
    )
    assert inspected.normalized_mime_type == "image/jpeg"
    assert inspected.safe_to_process is True
    assert inspected.extension_matches is (filename.lower().endswith((".jpg", ".jpeg")))


def test_png_renamed_to_jpeg_is_detected_as_png() -> None:
    inspected = FileInspector().inspect(image_bytes("PNG"), "report.jpg", "image/jpeg")
    assert inspected.normalized_mime_type == "image/png"
    assert inspected.extension_matches is False


@pytest.mark.parametrize(
    ("content", "filename", "mime_type"),
    [
        (image_bytes("PNG"), "report.png", "image/png"),
        (image_bytes("WEBP"), "mobile upload.webp", "image/webp"),
        (image_bytes("TIFF"), "scan.tiff", "image/tiff"),
        (b"%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF", "report.pdf", "application/pdf"),
        (
            office_zip("word"),
            "memo.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
        (
            office_zip("xl"),
            "prices.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
        (
            office_zip("ppt"),
            "briefing.pptx",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ),
        (b"product,price\nMango,10\nApple,12\n", "prices.csv", "text/csv"),
        (b"plain business note", "note.txt", "text/plain"),
        (b'{"status":"ok"}', "data.json", "application/json"),
    ],
)
def test_supported_formats_are_content_detected(
    content: bytes, filename: str, mime_type: str
) -> None:
    inspected = FileInspector().inspect(content, filename, None)
    assert inspected.normalized_mime_type == mime_type
    assert inspected.safe_to_process is True


@pytest.mark.parametrize(
    ("content", "filename", "error_code"),
    [
        (b"", "empty.pdf", "empty_file"),
        (b"MZ" + b"\x00" * 100, "invoice.pdf", "unsafe_file"),
        (b"not a supported binary\x00", "unknown.bin", "corrupt_file"),
        (b"%PDF-1.7\n/Encrypt true\n%%EOF", "locked.pdf", "encrypted_file"),
        (b"hello", "run.sh", "unsafe_file"),
    ],
)
def test_rejects_unsafe_or_unreadable_files(
    content: bytes, filename: str, error_code: str
) -> None:
    inspected = FileInspector().inspect(content, filename, "application/octet-stream")
    assert inspected.safe_to_process is False
    assert inspected.error_code == error_code


def test_filename_is_safe_but_preserves_unicode_for_display() -> None:
    assert (
        safe_display_filename("../../ WhatsApp रिपोर्ट 01.JPEG\n")
        == "WhatsApp रिपोर्ट 01.JPEG"
    )


def test_scanned_image_routes_through_normalization_then_document_ai() -> None:
    inspected = FileInspector().inspect(image_bytes("JPEG"), "market.jpeg", "image/jpg")
    plan = asyncio.run(FileProcessorRouter().route(inspected))
    assert plan.processor == Processor.image_normalizer
    assert plan.ocr_required is True
    assert plan.fallback_processor == Processor.document_ai
    assert plan.extraction_strategy == "normalize_then_ocr"


def test_pdf_has_native_parser_and_ocr_fallback() -> None:
    inspected = FileInspector().inspect(b"%PDF-1.7\n%%EOF", "scan.pdf", None)
    plan = asyncio.run(FileProcessorRouter().route(inspected))
    assert plan.processor == Processor.pdf_parser
    assert plan.fallback_processor == Processor.document_ai


def test_tiff_conversion_produces_valid_auditable_png() -> None:
    original = image_bytes("TIFF")
    inspected = FileInspector().inspect(original, "scan.tiff", "image/tiff")
    artifact = SafeImageConverter().normalize(
        original, inspected.checksum_sha256, "image/png"
    )
    converted = FileInspector().inspect(
        artifact.content, "scan.png", artifact.mime_type
    )
    assert converted.normalized_mime_type == "image/png"
    assert artifact.source_checksum_sha256 == inspected.checksum_sha256
    assert artifact.checksum_sha256 == converted.checksum_sha256


def test_gemini_capability_uses_canonical_image_part() -> None:
    adapter = GeminiAdapter()
    prepared = adapter.prepare_inline_input(image_bytes("JPEG"), "image/jpg")
    assert prepared.mime_type == "image/jpeg"
    assert prepared.part_type == "image"
    assert adapter.supports("application/octet-stream") is False

    with pytest.raises(UnsupportedProviderInput) as exc:
        adapter.prepare_inline_input(b"xls", "application/vnd.ms-excel")
    assert exc.value.error.code == "provider_unsupported_mime"
    assert "Unsupported MIME type" not in exc.value.error.user_message
