from __future__ import annotations

import asyncio
import hashlib
import uuid
from datetime import UTC, datetime

import dramatiq
from sqlalchemy import delete, select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.integrations.gemini.ocr import GeminiVisionOCR
from app.integrations.openai.embeddings import (
    EmbeddingUnavailable,
    OpenAIEmbeddingClient,
)
from app.jobs.broker import broker
from app.models import core as _core_models  # noqa: F401 - register FK targets
from app.models.knowledge import (
    Document,
    DocumentChunk,
    DocumentFile,
    DocumentVersion,
    FileKind,
    IngestionJob,
    IngestionStatus,
)
from app.services.files.mime_registry import Processor
from app.services.files.pipeline import (
    FileProcessingPipeline,
    OCRProcessor,
    PipelineRejected,
)
from app.services.storage import StorageError, SupabaseStorage


def derivative_extension(mime_type: str) -> str:
    return {"image/jpeg": "jpg", "image/png": "png"}.get(mime_type, "bin")


async def process_document_job(job_id: uuid.UUID) -> None:
    settings = get_settings()
    async with AsyncSessionLocal() as session:
        job = await session.get(IngestionJob, job_id)
        if job is None or job.status in {
            IngestionStatus.ready,
            IngestionStatus.cancelled,
        }:
            return
        version = await session.get(DocumentVersion, job.document_version_id)
        if version is None:
            return
        document = await session.get(Document, version.document_id)
        original_result = await session.execute(
            select(DocumentFile).where(
                DocumentFile.document_version_id == version.id,
                DocumentFile.kind == FileKind.original,
            )
        )
        original = original_result.scalar_one_or_none()
        if document is None or original is None or document.deleted_at is not None:
            return

        now = datetime.now(UTC)
        job.status = document.status = version.status = IngestionStatus.extracting
        job.attempt_count += 1
        job.started_at = job.started_at or now
        version.processing_started_at = version.processing_started_at or now
        await session.commit()

        try:
            storage = SupabaseStorage(settings)
            content = await storage.download(
                original.storage_bucket, original.storage_object
            )
            ocr_processors: dict[Processor, OCRProcessor] = {}
            if settings.gemini_api_key:
                ocr_processors[Processor.gemini_vision] = GeminiVisionOCR(settings)
            result = await FileProcessingPipeline(ocr_processors).process(
                content, original.original_filename, original.browser_mime_type
            )

            await session.refresh(document)
            await session.refresh(job)
            if (
                document.deleted_at is not None
                or job.status == IngestionStatus.cancelled
            ):
                cancelled = datetime.now(UTC)
                job.status = version.status = IngestionStatus.cancelled
                job.cancelled_at = job.cancelled_at or cancelled
                job.finished_at = job.finished_at or cancelled
                version.processing_finished_at = cancelled
                await session.commit()
                return

            if result.derivative:
                derivative_path = (
                    original.storage_object.rsplit("/original/", 1)[0]
                    + "/derivative/normalized."
                    + derivative_extension(result.derivative.mime_type)
                )
                existing = await session.scalar(
                    select(DocumentFile.id).where(
                        DocumentFile.storage_object == derivative_path
                    )
                )
                if not existing:
                    await storage.upload(
                        original.storage_bucket,
                        derivative_path,
                        result.derivative.content,
                        result.derivative.mime_type,
                    )
                    session.add(
                        DocumentFile(
                            document_version_id=version.id,
                            organization_id=document.organization_id,
                            business_id=document.business_id,
                            source_file_id=original.id,
                            kind=FileKind.derivative,
                            original_filename=original.original_filename,
                            safe_filename=(
                                "normalized."
                                + derivative_extension(result.derivative.mime_type)
                            ),
                            storage_bucket=original.storage_bucket,
                            storage_object=derivative_path,
                            detected_mime_type=result.derivative.mime_type,
                            normalized_mime_type=result.derivative.mime_type,
                            checksum_sha256=result.derivative.checksum_sha256,
                            size_bytes=len(result.derivative.content),
                            extension_matches=True,
                            converter_name=result.derivative.converter,
                            converter_version=None,
                            metadata_json={},
                        )
                    )

            job.status = document.status = version.status = IngestionStatus.chunking
            await session.execute(
                delete(DocumentChunk).where(
                    DocumentChunk.document_version_id == version.id
                )
            )
            texts = [
                section.text for section in result.sections if section.text.strip()
            ]
            embeddings: list[list[float]] = []
            if texts and settings.openai_api_key:
                job.status = document.status = version.status = (
                    IngestionStatus.embedding
                )
                try:
                    embeddings = await OpenAIEmbeddingClient(settings).embed_documents(
                        texts
                    )
                except EmbeddingUnavailable:
                    embeddings = []
            for index, section in enumerate(result.sections):
                if not section.text.strip():
                    continue
                metadata = section.metadata
                session.add(
                    DocumentChunk(
                        organization_id=document.organization_id,
                        business_id=document.business_id,
                        document_id=document.id,
                        document_version_id=version.id,
                        chunk_index=index,
                        text=section.text,
                        page_start=(
                            int(metadata["page"]) if "page" in metadata else None
                        ),
                        page_end=(
                            int(metadata["page"]) if "page" in metadata else None
                        ),
                        section_label=str(metadata.get("sheet") or "") or None,
                        embedding=(
                            embeddings[index] if index < len(embeddings) else None
                        ),
                        embedding_model=(
                            settings.embedding_model if embeddings else None
                        ),
                        content_hash=hashlib.sha256(
                            section.text.encode("utf-8")
                        ).hexdigest(),
                    )
                )
            finished = datetime.now(UTC)
            job.status = document.status = version.status = IngestionStatus.ready
            job.finished_at = finished
            version.processing_finished_at = finished
            await session.commit()
        except PipelineRejected as exc:
            failed = datetime.now(UTC)
            job.status = document.status = version.status = IngestionStatus.failed
            job.error_code = exc.error.code
            job.user_error = exc.error.user_message
            job.finished_at = failed
            version.processing_finished_at = failed
            await session.commit()
        except StorageError:
            failed = datetime.now(UTC)
            job.status = document.status = version.status = IngestionStatus.failed
            job.error_code = "storage_unavailable"
            job.user_error = (
                "The uploaded file is temporarily unavailable. Please retry."
            )
            job.finished_at = failed
            version.processing_finished_at = failed
            await session.commit()


@dramatiq.actor(broker=broker, max_retries=3, min_backoff=1000, max_backoff=30000)
def ingest_document(job_id: str) -> None:
    asyncio.run(process_document_job(uuid.UUID(job_id)))
