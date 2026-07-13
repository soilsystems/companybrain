from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.services.files.converter import ConversionArtifact, SafeImageConverter
from app.services.files.errors import IngestionError, user_error
from app.services.files.file_inspector import FileInspector, InspectedFile
from app.services.files.mime_registry import Processor
from app.services.files.parsers import (
    ExtractedSection,
    parse_csv,
    parse_docx,
    parse_json,
    parse_pdf,
    parse_pptx,
    parse_text,
    parse_xls,
    parse_xlsx,
)
from app.services.files.processor_router import FileProcessorRouter, ProcessingPlan


class OCRProcessor(Protocol):
    async def extract(
        self, content: bytes, mime_type: str
    ) -> list[ExtractedSection]: ...


class ProcessorFailure(RuntimeError):
    def __init__(self, code: str, *, retryable: bool) -> None:
        super().__init__(code)
        self.code = code
        self.retryable = retryable


@dataclass(frozen=True)
class ProcessingAttempt:
    processor: Processor
    attempt_number: int
    success: bool
    error_code: str | None = None


@dataclass(frozen=True)
class PipelineResult:
    inspected_file: InspectedFile
    plan: ProcessingPlan
    sections: list[ExtractedSection]
    processor: Processor
    derivative: ConversionArtifact | None
    attempts: list[ProcessingAttempt]
    fallback_used: bool


class PipelineRejected(ValueError):
    def __init__(self, error: IngestionError) -> None:
        super().__init__(error.code)
        self.error = error


class FileProcessingPipeline:
    def __init__(
        self, ocr_processors: dict[Processor, OCRProcessor] | None = None
    ) -> None:
        self.ocr_processors = ocr_processors or {}

    async def process(
        self,
        content: bytes,
        filename: str,
        browser_mime_type: str | None = None,
    ) -> PipelineResult:
        inspected = FileInspector().inspect(content, filename, browser_mime_type)
        if not inspected.safe_to_process:
            raise PipelineRejected(
                user_error(inspected.error_code or "unsupported_file")
            )
        plan = await FileProcessorRouter().route(inspected)
        derivative = None
        processing_content = content
        processing_mime = inspected.normalized_mime_type

        if plan.conversion_processor == Processor.image_normalizer:
            target = plan.conversion_target
            if not target:
                target = (
                    "image/jpeg"
                    if inspected.normalized_mime_type == "image/jpeg"
                    else "image/png"
                )
            derivative = SafeImageConverter().normalize(
                content, inspected.checksum_sha256, target
            )
            processing_content = derivative.content
            processing_mime = derivative.mime_type

        native_sections = self._native_extract(
            plan.processor, processing_content, processing_mime
        )
        if native_sections is not None and native_sections:
            return PipelineResult(
                inspected,
                plan,
                native_sections,
                plan.processor,
                derivative,
                [],
                False,
            )

        processors = [plan.processor]
        if plan.fallback_processor and plan.fallback_processor != plan.processor:
            processors.append(plan.fallback_processor)
        attempts: list[ProcessingAttempt] = []
        for processor_index, processor in enumerate(processors):
            adapter = self.ocr_processors.get(processor)
            if adapter is None:
                attempts.append(
                    ProcessingAttempt(processor, 1, False, "processor_not_configured")
                )
                continue
            max_attempts = plan.retry_policy.max_attempts
            for attempt_number in range(1, max_attempts + 1):
                try:
                    sections = await adapter.extract(
                        processing_content, processing_mime
                    )
                    if not sections:
                        raise ProcessorFailure("empty_extraction", retryable=False)
                    attempts.append(ProcessingAttempt(processor, attempt_number, True))
                    return PipelineResult(
                        inspected,
                        plan,
                        sections,
                        processor,
                        derivative,
                        attempts,
                        processor_index > 0,
                    )
                except ProcessorFailure as exc:
                    attempts.append(
                        ProcessingAttempt(processor, attempt_number, False, exc.code)
                    )
                    if not exc.retryable:
                        break
        raise PipelineRejected(user_error("processing_failed"))

    @staticmethod
    def _native_extract(
        processor: Processor, content: bytes, mime_type: str
    ) -> list[ExtractedSection] | None:
        if processor == Processor.pdf_parser:
            return parse_pdf(content)
        if processor == Processor.docx_parser:
            return parse_docx(content)
        if processor == Processor.spreadsheet_parser:
            if mime_type == "text/csv":
                return parse_csv(content)
            if mime_type == "application/vnd.ms-excel":
                return parse_xls(content)
            return parse_xlsx(content)
        if processor == Processor.text_parser:
            return parse_text(content)
        if processor == Processor.json_parser:
            return parse_json(content)
        if processor == Processor.pptx_parser:
            return parse_pptx(content)
        return None
