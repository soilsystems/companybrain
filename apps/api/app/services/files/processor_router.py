from __future__ import annotations

from dataclasses import dataclass

from app.services.files.file_inspector import InspectedFile
from app.services.files.mime_registry import FileCategory, Processor, definition_for


@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int
    retryable_error_codes: frozenset[str]


@dataclass(frozen=True)
class ProcessingPlan:
    normalized_mime_type: str
    processor: Processor
    conversion_target: str | None
    ocr_required: bool
    fallback_processor: Processor | None
    extraction_strategy: str
    retry_policy: RetryPolicy


class FileProcessorRouter:
    async def route(self, file: InspectedFile) -> ProcessingPlan:
        if not file.safe_to_process:
            return ProcessingPlan(
                file.normalized_mime_type,
                Processor.reject,
                None,
                False,
                None,
                "reject",
                RetryPolicy(0, frozenset()),
            )
        definition = definition_for(file.normalized_mime_type)
        if definition is None:
            raise ValueError("Inspected safe file has no MIME definition")

        processor = definition.processor
        strategy = processor.value
        fallback = file.fallback_processor
        if file.category == FileCategory.image:
            processor = Processor.image_normalizer
            strategy = "normalize_then_ocr"
        elif file.category == FileCategory.pdf:
            strategy = "native_pdf_then_ocr_when_no_text"

        return ProcessingPlan(
            normalized_mime_type=file.normalized_mime_type,
            processor=processor,
            conversion_target=definition.conversion_target,
            ocr_required=definition.ocr_required,
            fallback_processor=fallback,
            extraction_strategy=strategy,
            retry_policy=RetryPolicy(
                max_attempts=3,
                retryable_error_codes=frozenset(
                    {
                        "provider_timeout",
                        "provider_rate_limited",
                        "temporary_storage_error",
                    }
                ),
            ),
        )
