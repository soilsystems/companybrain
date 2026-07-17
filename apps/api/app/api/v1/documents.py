from __future__ import annotations

import uuid
from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import get_db_session
from app.jobs.document_ingestion import ingest_document
from app.models.base import RecordStatus
from app.models.core import Business, Membership, MembershipRole, Organization, User
from app.models.knowledge import (
    Document,
    DocumentAccessEvent,
    DocumentFile,
    DocumentIdentifier,
    DocumentVersion,
    FileKind,
    IngestionJob,
    IngestionStatus,
)
from app.schemas.documents import (
    ConfirmUploadRequest,
    DeleteDocumentResponse,
    DocumentDetailResponse,
    DocumentIdentifierResponse,
    DocumentSearchResponse,
    DocumentSearchResult,
    DocumentStatusResponse,
    SignedDocumentUrlResponse,
    UploadIntentRequest,
    UploadIntentResponse,
)
from app.services.auth import get_current_user
from app.services.document_identifiers import (
    NORMALIZATION_VERSION,
    normalize_identifier,
)
from app.services.document_ingestion import (
    authorize_document_scope,
    build_storage_path,
    inspect_and_queue,
)
from app.services.document_search import search_documents
from app.services.files.file_inspector import safe_display_filename
from app.services.storage import StorageError, SupabaseStorage

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])
logger = structlog.get_logger()


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
        title=payload.title or safe_name,
        description=payload.description,
        category=payload.category,
        document_type=payload.document_type,
        document_date=payload.document_date,
        party_owner=payload.party_owner,
        location=payload.location,
        tags=payload.tags,
    )
    identifier = (
        DocumentIdentifier(
            id=uuid.uuid4(),
            organization_id=scope.organization_id,
            business_id=scope.business_id,
            document_id=document.id,
            identifier_type="survey_number",
            identifier_value=payload.survey_number,
            normalized_value=normalize_identifier(payload.survey_number),
            normalization_version=NORMALIZATION_VERSION,
            is_primary=True,
        )
        if payload.survey_number
        else None
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
    session.add_all(
        [document, version] + ([identifier] if identifier is not None else [])
    )
    # Persist the version before its original file. DocumentFile has a self-reference,
    # so SQLAlchemy cannot always infer this insert order from raw foreign-key IDs.
    await session.flush()
    session.add(file)
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
        .join(
            Membership,
            (Membership.organization_id == Document.organization_id)
            & (Membership.business_id == Document.business_id),
        )
        .where(
            DocumentFile.id == file_id,
            Membership.user_id == user.id,
            Membership.status == RecordStatus.active,
            Document.deleted_at.is_(None),
        )
    )
    file = result.scalar_one_or_none()
    if file is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return file


async def authorized_document_bundle(
    session: AsyncSession, user: User, document_id: uuid.UUID
) -> tuple[Document, DocumentVersion, DocumentFile, IngestionJob | None]:
    result = await session.execute(
        select(Document, DocumentVersion, DocumentFile, IngestionJob)
        .join(DocumentVersion, DocumentVersion.document_id == Document.id)
        .join(DocumentFile, DocumentFile.document_version_id == DocumentVersion.id)
        .outerjoin(IngestionJob, IngestionJob.document_version_id == DocumentVersion.id)
        .join(
            Membership,
            (Membership.organization_id == Document.organization_id)
            & (Membership.business_id == Document.business_id),
        )
        .where(
            Document.id == document_id,
            Document.deleted_at.is_(None),
            DocumentFile.kind == FileKind.original,
            Membership.user_id == user.id,
            Membership.status == RecordStatus.active,
        )
        .order_by(DocumentVersion.version_number.desc())
        .limit(1)
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return row[0], row[1], row[2], row[3]


async def document_identifiers(
    session: AsyncSession, document_id: uuid.UUID
) -> list[DocumentIdentifierResponse]:
    result = await session.execute(
        select(DocumentIdentifier)
        .where(DocumentIdentifier.document_id == document_id)
        .order_by(DocumentIdentifier.is_primary.desc(), DocumentIdentifier.created_at)
    )
    return [
        DocumentIdentifierResponse(
            type=item.identifier_type,
            value=item.identifier_value,
            normalized_value=item.normalized_value,
            is_primary=item.is_primary,
        )
        for item in result.scalars()
    ]


async def document_scope_details(
    session: AsyncSession, user: User, document: Document
) -> tuple[str, str, bool]:
    row = (
        await session.execute(
            select(Organization.name, Business.name, Membership.role)
            .join(Business, Business.organization_id == Organization.id)
            .join(
                Membership,
                (Membership.organization_id == Organization.id)
                & (Membership.business_id == Business.id),
            )
            .where(
                Organization.id == document.organization_id,
                Business.id == document.business_id,
                Membership.user_id == user.id,
                Membership.status == RecordStatus.active,
            )
        )
    ).one()
    role = row[2]
    can_delete = role in {MembershipRole.owner, MembershipRole.admin} or (
        document.created_by_user_id == user.id
    )
    return str(row[0]), str(row[1]), can_delete


@router.get("", response_model=DocumentSearchResponse)
async def list_documents(
    business_id: uuid.UUID = Query(),
    domain_id: uuid.UUID | None = Query(default=None),
    category: str | None = Query(default=None, max_length=200),
    document_type: str | None = Query(default=None, max_length=200),
    processing_status: str | None = Query(default=None, max_length=50),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentSearchResponse:
    filters = [
        Membership.user_id == current_user.id,
        Membership.status == RecordStatus.active,
        Membership.organization_id == Document.organization_id,
        Membership.business_id == Document.business_id,
        Document.business_id == business_id,
        Document.deleted_at.is_(None),
    ]
    if domain_id:
        filters.append(Document.domain_id == domain_id)
    if category:
        filters.append(Document.category == category)
    if document_type:
        filters.append(Document.document_type == document_type)
    if processing_status:
        filters.append(Document.status == processing_status)
    total = await session.scalar(
        select(func.count(func.distinct(Document.id)))
        .select_from(Document)
        .join(Membership, Membership.business_id == Document.business_id)
        .where(*filters)
    )
    rows = await session.execute(
        select(Document)
        .join(Membership, Membership.business_id == Document.business_id)
        .where(*filters)
        .distinct()
        .order_by(Document.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    results: list[DocumentSearchResult] = []
    for document in rows.scalars():
        organization_name, business_name, can_delete = await document_scope_details(
            session, current_user, document
        )
        identifiers = await document_identifiers(session, document.id)
        file_result = await session.execute(
            select(DocumentFile)
            .join(
                DocumentVersion, DocumentVersion.id == DocumentFile.document_version_id
            )
            .where(
                DocumentVersion.document_id == document.id,
                DocumentFile.kind == FileKind.original,
            )
            .order_by(DocumentVersion.version_number.desc())
            .limit(1)
        )
        original = file_result.scalar_one_or_none()
        survey = next(
            (value.value for value in identifiers if value.type == "survey_number"),
            None,
        )
        results.append(
            DocumentSearchResult(
                document_id=document.id,
                organization_id=document.organization_id,
                organization_name=organization_name,
                business_id=document.business_id,
                business_name=business_name,
                title=document.title,
                survey_number=survey,
                alternate_identifiers=[
                    value for value in identifiers if value.type != "survey_number"
                ],
                description=document.description,
                category=document.category,
                document_type=document.document_type,
                document_date=document.document_date,
                party_owner=document.party_owner,
                location=document.location,
                tags=document.tags,
                original_filename=original.original_filename if original else None,
                match_type="recent",
                match_reason="recently updated",
                highlighted_snippet=document.description,
                score=0,
                processing_status=document.status.value,
                can_view=True,
                can_download=True,
                can_delete=can_delete,
                updated_at=document.updated_at,
            )
        )
    return DocumentSearchResponse(
        query="", page=page, page_size=page_size, total=int(total or 0), results=results
    )


@router.get("/search", response_model=DocumentSearchResponse)
async def search(
    q: str = Query(min_length=1, max_length=500),
    organization_id: uuid.UUID = Query(),
    business_id: uuid.UUID | None = Query(default=None),
    domain_id: uuid.UUID | None = Query(default=None),
    category: str | None = Query(default=None, max_length=200),
    document_type: str | None = Query(default=None, max_length=200),
    processing_status: str | None = Query(default=None, max_length=50),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentSearchResponse:
    total, ranked = await search_documents(
        session,
        current_user,
        query=q,
        organization_id=organization_id,
        business_id=business_id,
        domain_id=domain_id,
        status=processing_status,
        category=category,
        document_type=document_type,
        page=page,
        page_size=page_size,
        query_embedding=None,
        search_content=False,
    )
    results: list[DocumentSearchResult] = []
    for item in ranked:
        organization_name, business_name, can_delete = await document_scope_details(
            session, current_user, item.document
        )
        identifiers = await document_identifiers(session, item.document.id)
        file_result = await session.execute(
            select(DocumentFile)
            .join(
                DocumentVersion, DocumentVersion.id == DocumentFile.document_version_id
            )
            .where(
                DocumentVersion.document_id == item.document.id,
                DocumentFile.kind == FileKind.original,
            )
            .order_by(DocumentVersion.version_number.desc())
            .limit(1)
        )
        original = file_result.scalar_one_or_none()
        survey = next(
            (value.value for value in identifiers if value.type == "survey_number"),
            None,
        )
        results.append(
            DocumentSearchResult(
                document_id=item.document.id,
                organization_id=item.document.organization_id,
                organization_name=organization_name,
                business_id=item.document.business_id,
                business_name=business_name,
                title=item.document.title,
                survey_number=survey,
                alternate_identifiers=[
                    value for value in identifiers if value.type != "survey_number"
                ],
                description=item.document.description,
                category=item.document.category,
                document_type=item.document.document_type,
                document_date=item.document.document_date,
                party_owner=item.document.party_owner,
                location=item.document.location,
                tags=item.document.tags,
                original_filename=original.original_filename if original else None,
                match_type=item.match_type,
                match_reason=item.match_reason,
                highlighted_snippet=item.snippet,
                score=item.score,
                processing_status=item.document.status.value,
                can_view=True,
                can_download=True,
                can_delete=can_delete,
                updated_at=item.document.updated_at,
            )
        )
    return DocumentSearchResponse(
        query=q, page=page, page_size=page_size, total=total, results=results
    )


@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def document_detail(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentDetailResponse:
    document, version, file, _job = await authorized_document_bundle(
        session, current_user, document_id
    )
    identifiers = await document_identifiers(session, document.id)
    organization_name, business_name, can_delete = await document_scope_details(
        session, current_user, document
    )
    return DocumentDetailResponse(
        document_id=document.id,
        organization_id=document.organization_id,
        organization_name=organization_name,
        business_id=document.business_id,
        business_name=business_name,
        title=document.title,
        display_name=document.display_name,
        description=document.description,
        category=document.category,
        document_type=document.document_type,
        document_date=document.document_date,
        party_owner=document.party_owner,
        location=document.location,
        tags=document.tags,
        identifiers=identifiers,
        processing_status=document.status.value,
        original_filename=file.original_filename,
        normalized_mime_type=file.normalized_mime_type,
        size_bytes=file.size_bytes,
        version_number=version.version_number,
        can_view=True,
        can_download=True,
        can_delete=can_delete,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


async def signed_document_url(
    *,
    document_id: uuid.UUID,
    event_type: str,
    download: bool,
    current_user: User,
    session: AsyncSession,
    settings: Settings,
) -> SignedDocumentUrlResponse:
    document, _version, original, _job = await authorized_document_bundle(
        session, current_user, document_id
    )
    viewable_mimes = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "text/plain",
        "text/csv",
        "application/json",
    }
    if not download and original.normalized_mime_type not in viewable_mimes:
        raise HTTPException(
            status_code=409,
            detail="A safe in-browser preview is not available for this file yet.",
        )
    try:
        signed = await SupabaseStorage(settings).create_signed_object_url(
            original.storage_bucket,
            original.storage_object,
            settings.signed_url_expiry_seconds,
            download_filename=original.safe_filename if download else None,
        )
    except StorageError as exc:
        raise HTTPException(
            status_code=404 if str(exc) == "object_not_found" else 503,
            detail="The document file is temporarily unavailable.",
        ) from exc
    session.add(
        DocumentAccessEvent(
            organization_id=document.organization_id,
            business_id=document.business_id,
            document_id=document.id,
            document_file_id=original.id,
            user_id=current_user.id,
            event_type=event_type,
        )
    )
    await session.commit()
    return SignedDocumentUrlResponse(
        url=signed.url, expires_in_seconds=settings.signed_url_expiry_seconds
    )


@router.post("/{document_id}/view-url", response_model=SignedDocumentUrlResponse)
async def create_view_url(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> SignedDocumentUrlResponse:
    return await signed_document_url(
        document_id=document_id,
        event_type="view",
        download=False,
        current_user=current_user,
        session=session,
        settings=settings,
    )


@router.post("/{document_id}/download-url", response_model=SignedDocumentUrlResponse)
async def create_download_url(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> SignedDocumentUrlResponse:
    return await signed_document_url(
        document_id=document_id,
        event_type="download",
        download=True,
        current_user=current_user,
        session=session,
        settings=settings,
    )


@router.delete("/{document_id}", response_model=DeleteDocumentResponse)
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> DeleteDocumentResponse:
    document, version, original, job = await authorized_document_bundle(
        session, current_user, document_id
    )
    _organization_name, _business_name, can_delete = await document_scope_details(
        session, current_user, document
    )
    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this document.",
        )

    now = datetime.now(UTC)
    document.deleted_at = now
    if job and job.status not in {
        IngestionStatus.ready,
        IngestionStatus.failed,
        IngestionStatus.rejected,
        IngestionStatus.cancelled,
    }:
        job.status = IngestionStatus.cancelled
        job.cancelled_at = now
        job.finished_at = now
        version.status = IngestionStatus.cancelled
        version.processing_finished_at = now
    session.add(
        DocumentAccessEvent(
            organization_id=document.organization_id,
            business_id=document.business_id,
            document_id=document.id,
            document_file_id=original.id,
            user_id=current_user.id,
            event_type="delete",
        )
    )
    await session.commit()
    return DeleteDocumentResponse(
        document_id=document.id,
        deleted=True,
        message="Document moved to trash.",
    )


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
    try:
        ingest_document.send(str(job.id))
    except Exception:
        logger.exception(
            "ingestion_enqueue_failed",
            document_id=str(document.id),
            ingestion_job_id=str(job.id),
            organization_id=str(file.organization_id),
            business_id=str(file.business_id),
        )
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
            Document.deleted_at.is_(None),
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
