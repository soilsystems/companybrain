from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import RecordStatus
from app.models.core import BusinessDomain, Membership, User
from app.models.knowledge import (
    Document,
    DocumentFile,
    DocumentVersion,
    IngestionJob,
    IngestionStatus,
)
from app.services.files.errors import user_error
from app.services.files.file_inspector import FileInspector
from app.services.files.processor_router import FileProcessorRouter


@dataclass(frozen=True)
class AuthorizedScope:
    organization_id: uuid.UUID
    business_id: uuid.UUID
    domain_id: uuid.UUID


async def authorize_document_scope(
    session: AsyncSession, user: User, business_id: uuid.UUID, domain_id: uuid.UUID
) -> AuthorizedScope:
    result = await session.execute(
        select(Membership.organization_id)
        .join(
            BusinessDomain,
            (BusinessDomain.organization_id == Membership.organization_id)
            & (BusinessDomain.business_id == Membership.business_id),
        )
        .where(
            Membership.user_id == user.id,
            Membership.business_id == business_id,
            Membership.status == RecordStatus.active,
            BusinessDomain.domain_id == domain_id,
            BusinessDomain.enabled.is_(True),
        )
    )
    organization_id = result.scalar_one_or_none()
    if organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Document scope is not authorized.",
        )
    return AuthorizedScope(organization_id, business_id, domain_id)


def build_storage_path(
    scope: AuthorizedScope,
    document_id: uuid.UUID,
    version_id: uuid.UUID,
    safe_filename: str,
) -> str:
    return (
        f"organizations/{scope.organization_id}/businesses/{scope.business_id}/"
        f"domains/{scope.domain_id}/documents/{document_id}/versions/{version_id}/"
        f"original/{safe_filename}"
    )


async def inspect_and_queue(
    session: AsyncSession, document_file: DocumentFile, content: bytes
) -> IngestionJob:
    version = await session.get(DocumentVersion, document_file.document_version_id)
    if version is None:
        raise RuntimeError("document_version_not_found")
    document = await session.get(Document, version.document_id)
    if document is None:
        raise RuntimeError("document_not_found")

    document.status = version.status = IngestionStatus.validating
    inspected = FileInspector().inspect(
        content, document_file.original_filename, document_file.browser_mime_type
    )
    document_file.safe_filename = inspected.safe_filename
    document_file.detected_mime_type = inspected.detected_mime_type
    document_file.normalized_mime_type = inspected.normalized_mime_type
    document_file.checksum_sha256 = inspected.checksum_sha256
    document_file.size_bytes = inspected.size
    document_file.extension_matches = inspected.extension_matches

    job = IngestionJob(
        document_version_id=version.id,
        organization_id=document_file.organization_id,
        business_id=document_file.business_id,
        status=IngestionStatus.queued,
        attempt_count=0,
        queued_at=datetime.now(UTC),
    )
    if not inspected.safe_to_process:
        error = user_error(inspected.error_code or "unsupported_file")
        document.status = version.status = IngestionStatus.rejected
        job.status = IngestionStatus.rejected
        job.error_code = error.code
        job.user_error = error.user_message
        job.finished_at = datetime.now(UTC)
    else:
        plan = await FileProcessorRouter().route(inspected)
        document.status = version.status = IngestionStatus.queued
        job.selected_processor = plan.processor.value
        job.fallback_processor = (
            plan.fallback_processor.value if plan.fallback_processor else None
        )
    session.add(job)
    await session.flush()
    return job
