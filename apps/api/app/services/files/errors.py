from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class IngestionError:
    code: str
    user_message: str
    retryable: bool


ERRORS = {
    "empty_file": IngestionError(
        "empty_file",
        "This file is empty. Please choose a file that contains data.",
        False,
    ),
    "corrupt_file": IngestionError(
        "corrupt_file",
        "This file appears to be damaged or incomplete. Please upload another copy.",
        False,
    ),
    "unsafe_file": IngestionError(
        "unsafe_file", "This file type is not supported for security reasons.", False
    ),
    "encrypted_file": IngestionError(
        "encrypted_file",
        "This document is password protected. Please upload an unlocked copy.",
        False,
    ),
    "file_too_large": IngestionError(
        "file_too_large",
        "This file is larger than the supported limit. Please upload a smaller file.",
        False,
    ),
    "unsupported_file": IngestionError(
        "unsupported_file",
        "We could not read this file in its current format. We kept the original "
        "safely. Please use PDF, JPG, PNG, WebP, TIFF, DOCX, XLSX, XLS, CSV, "
        "TXT, JSON, or PPTX.",
        False,
    ),
    "provider_unsupported_mime": IngestionError(
        "provider_unsupported_mime",
        "We could not read this file in its current format. Please retry so we "
        "can use another processor.",
        True,
    ),
    "processing_failed": IngestionError(
        "processing_failed",
        "We could not finish processing this file. The original is safe; please retry.",
        True,
    ),
}


def user_error(code: str) -> IngestionError:
    return ERRORS.get(code, ERRORS["processing_failed"])
