from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import get_db_session
from app.models.core import User
from app.models.knowledge import (
    Document,
    DocumentFile,
    DocumentVersion,
    FileKind,
    IngestionJob,
)
from app.schemas.documents import (
    ConfirmUploadRequest,
    DocumentStatusResponse,
    UploadIntentRequest,
    UploadIntentResponse,
)
from app.services.auth import get_current_user
from app.services.document_ingestion import (
    authorize_document_scope,
    build_storage_path,
    inspect_and_queue,
)
from app.services.files.file_inspector import safe_display_filename
from app.services.storage import StorageError, SupabaseStorage

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


@router.post("/upload-intents", response_model=UploadIntentResponse, status_code=201)
async def create_upload_intent(
    payload: UploadIntentRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> UploadIntentResponse:
    if payload.size_bytes > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="This file is larger than the supported upload limit.",
        )
    scope = await authorize_document_scope(
        session, current_user, payload.business_id, payload.domain_id
    )
    safe_name = safe_display_filename(payload.filename)
    document = Document(
        id=uuid.uuid4(),
        organization_id=scope.organization_id,
        business_id=scope.business_id,
        domain_id=scope.domain_id,
        created_by_user_id=current_user.id,
        display_name=safe_name,
    )
    version = DocumentVersion(
        id=uuid.uuid4(),
        document_id=document.id,
        organization_id=scope.organization_id,
        business_id=scope.business_id,
        version_number=1,
    )
    object_path = build_storage_path(scope, document.id, version.id, safe_name)
    file = DocumentFile(
        id=uuid.uuid4(),
        document_version_id=version.id,
        organization_id=scope.organization_id,
        business_id=scope.business_id,
        kind=FileKind.original,
        original_filename=payload.filename,
        safe_filename=safe_name,
        storage_bucket=settings.supabase_storage_bucket,
        storage_object=object_path,
        browser_mime_type=payload.browser_mime_type,
        size_bytes=payload.size_bytes,
    )
    session.add_all([document, version, file])
    try:
        signed = await SupabaseStorage(settings).create_signed_upload(
            settings.supabase_storage_bucket, object_path
        )
    except StorageError as exc:
        raise HTTPException(
            status_code=503, detail="File storage is temporarily unavailable."
        ) from exc
    await session.commit()
    return UploadIntentResponse(
        document_id=document.id,
        document_version_id=version.id,
        document_file_id=file.id,
        upload_url=signed.url,
        upload_token=signed.token,
        expires_in_seconds=settings.signed_url_expiry_seconds,
    )


async def scoped_file(
    session: AsyncSession, user: User, file_id: uuid.UUID
) -> DocumentFile:
    result = await session.execute(
        select(DocumentFile)
        .join(DocumentVersion, DocumentVersion.id == DocumentFile.document_version_id)
        .join(Document, Document.id == DocumentVersion.document_id)
        .where(DocumentFile.id == file_id, Document.created_by_user_id == user.id)
    )
    file = result.scalar_one_or_none()
    if file is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return file


@router.post("/confirm", response_model=DocumentStatusResponse, status_code=202)
async def confirm_upload(
    payload: ConfirmUploadRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> DocumentStatusResponse:
    file = await scoped_file(session, current_user, payload.document_file_id)
    try:
        content = await SupabaseStorage(settings).download(
            file.storage_bucket, file.storage_object
        )
    except StorageError as exc:
        raise HTTPException(
            status_code=409,
            detail="The upload could not be verified. Please retry the upload.",
        ) from exc
    job = await inspect_and_queue(session, file, content)
    version = await session.get(DocumentVersion, file.document_version_id)
    if version is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    document = await session.get(Document, version.document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    await session.commit()
    return DocumentStatusResponse(
        document_id=document.id,
        filename=document.display_name,
        status=job.status.value,
        detected_mime_type=file.normalized_mime_type,
        extension_matches=file.extension_matches,
        processor=job.selected_processor,
        attempt_count=job.attempt_count,
        error_code=job.error_code,
        user_message=job.user_error,
        updated_at=job.updated_at,
    )


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def document_status(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentStatusResponse:
    result = await session.execute(
        select(Document, DocumentVersion, DocumentFile, IngestionJob)
        .join(DocumentVersion, DocumentVersion.document_id == Document.id)
        .join(DocumentFile, DocumentFile.document_version_id == DocumentVersion.id)
        .join(IngestionJob, IngestionJob.document_version_id == DocumentVersion.id)
        .where(
            Document.id == document_id,
            Document.created_by_user_id == current_user.id,
            DocumentFile.kind == FileKind.original,
        )
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found."
        )
    document, _version, file, job = row
    return DocumentStatusResponse(
        document_id=document.id,
        filename=document.display_name,
        status=job.status.value,
        detected_mime_type=file.normalized_mime_type,
        extension_matches=file.extension_matches,
        processor=job.selected_processor,
        attempt_count=job.attempt_count,
        error_code=job.error_code,
        user_message=job.user_error,
        updated_at=job.updated_at,
    )
