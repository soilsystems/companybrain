from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class IngestionStatus(StrEnum):
    uploaded = "uploaded"
    validating = "validating"
    accepted = "accepted"
    rejected = "rejected"
    queued = "queued"
    converting = "converting"
    extracting = "extracting"
    ocr_processing = "ocr_processing"
    chunking = "chunking"
    embedding = "embedding"
    ready = "ready"
    partially_processed = "partially_processed"
    failed = "failed"
    cancelled = "cancelled"


class FileKind(StrEnum):
    original = "original"
    derivative = "derivative"
    extraction = "extraction"
    preview = "preview"


ingestion_status_enum = Enum(
    IngestionStatus, name="ingestion_status", schema="knowledge"
)
file_kind_enum = Enum(FileKind, name="document_file_kind", schema="knowledge")


class Document(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_documents_scope", "organization_id", "business_id", "domain_id"),
        {"schema": "knowledge"},
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("core.organizations.id", ondelete="CASCADE")
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("core.businesses.id", ondelete="CASCADE")
    )
    domain_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("core.domains.id", ondelete="RESTRICT")
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("core.users.id", ondelete="RESTRICT")
    )
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(Text)
    document_type: Mapped[str | None] = mapped_column(Text)
    document_date: Mapped[datetime | None] = mapped_column(Date)
    party_owner: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    deleted_at: Mapped[datetime | None]
    status: Mapped[IngestionStatus] = mapped_column(
        ingestion_status_enum, default=IngestionStatus.uploaded, nullable=False
    )


class DocumentVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "document_versions"
    __table_args__ = (
        UniqueConstraint("document_id", "version_number", name="uq_document_version"),
        Index("ix_document_versions_scope", "organization_id", "business_id"),
        {"schema": "knowledge"},
    )

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("knowledge.documents.id", ondelete="CASCADE")
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[IngestionStatus] = mapped_column(
        ingestion_status_enum, default=IngestionStatus.uploaded, nullable=False
    )
    processing_started_at: Mapped[datetime | None]
    processing_finished_at: Mapped[datetime | None]


class DocumentFile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "document_files"
    __table_args__ = (
        Index("ix_document_files_scope", "organization_id", "business_id"),
        Index("ix_document_files_version", "document_version_id"),
        {"schema": "knowledge"},
    )

    document_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge.document_versions.id", ondelete="CASCADE"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    source_file_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge.document_files.id", ondelete="RESTRICT"),
    )
    kind: Mapped[FileKind] = mapped_column(file_kind_enum, nullable=False)
    original_filename: Mapped[str] = mapped_column(Text, nullable=False)
    safe_filename: Mapped[str] = mapped_column(Text, nullable=False)
    storage_bucket: Mapped[str] = mapped_column(Text, nullable=False)
    storage_object: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    browser_mime_type: Mapped[str | None] = mapped_column(Text)
    detected_mime_type: Mapped[str | None] = mapped_column(Text)
    normalized_mime_type: Mapped[str | None] = mapped_column(Text)
    checksum_sha256: Mapped[str | None] = mapped_column(Text)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    extension_matches: Mapped[bool | None]
    converter_name: Mapped[str | None] = mapped_column(Text)
    converter_version: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[dict[str, object]] = mapped_column(
        JSONB, default=dict, nullable=False
    )


class IngestionJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ingestion_jobs"
    __table_args__ = (
        UniqueConstraint("document_version_id", name="uq_ingestion_job_version"),
        Index("ix_ingestion_jobs_scope", "organization_id", "business_id", "status"),
        {"schema": "knowledge"},
    )

    document_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge.document_versions.id", ondelete="CASCADE"),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[IngestionStatus] = mapped_column(
        ingestion_status_enum, default=IngestionStatus.queued, nullable=False
    )
    selected_processor: Mapped[str | None] = mapped_column(Text)
    fallback_processor: Mapped[str | None] = mapped_column(Text)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_code: Mapped[str | None] = mapped_column(Text)
    user_error: Mapped[str | None] = mapped_column(Text)
    internal_error: Mapped[str | None] = mapped_column(Text)
    queued_at: Mapped[datetime | None]
    started_at: Mapped[datetime | None]
    finished_at: Mapped[datetime | None]
    cancelled_at: Mapped[datetime | None]


class IngestionAttempt(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ingestion_attempts"
    __table_args__ = (
        UniqueConstraint("ingestion_job_id", "attempt_number", name="uq_job_attempt"),
        Index("ix_ingestion_attempts_job", "ingestion_job_id"),
        {"schema": "knowledge"},
    )

    ingestion_job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge.ingestion_jobs.id", ondelete="CASCADE"),
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    processor: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[IngestionStatus] = mapped_column(
        ingestion_status_enum, nullable=False
    )
    error_code: Mapped[str | None] = mapped_column(Text)
    internal_error: Mapped[str | None] = mapped_column(Text)
    retryable: Mapped[bool] = mapped_column(default=False, nullable=False)
    started_at: Mapped[datetime | None]
    finished_at: Mapped[datetime | None]


class DocumentIdentifier(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "document_identifiers"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "business_id",
            "document_id",
            "identifier_type",
            "identifier_value",
            name="uq_document_identifier_original",
        ),
        Index(
            "ix_document_identifiers_exact",
            "organization_id",
            "business_id",
            "identifier_type",
            "identifier_value",
        ),
        Index(
            "ix_document_identifiers_normalized",
            "organization_id",
            "business_id",
            "identifier_type",
            "normalized_value",
        ),
        {"schema": "knowledge"},
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge.documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    identifier_type: Mapped[str] = mapped_column(Text, nullable=False)
    identifier_value: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_value: Mapped[str] = mapped_column(Text, nullable=False)
    normalization_version: Mapped[int] = mapped_column(Integer, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class DocumentChunk(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "document_chunks"
    __table_args__ = (
        UniqueConstraint(
            "document_version_id", "chunk_index", name="uq_document_chunk_index"
        ),
        Index("ix_document_chunks_scope", "organization_id", "business_id"),
        Index("ix_document_chunks_document", "document_id", "document_version_id"),
        {"schema": "knowledge"},
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge.documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    document_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge.document_versions.id", ondelete="CASCADE"),
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    page_start: Mapped[int | None] = mapped_column(Integer)
    page_end: Mapped[int | None] = mapped_column(Integer)
    section_label: Mapped[str | None] = mapped_column(Text)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1024))
    embedding_model: Mapped[str | None] = mapped_column(Text)
    content_hash: Mapped[str] = mapped_column(Text, nullable=False)


class DocumentAccessEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "document_access_events"
    __table_args__ = (
        Index(
            "ix_document_access_events_scope",
            "organization_id",
            "business_id",
            "document_id",
        ),
        {"schema": "audit"},
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge.documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    document_file_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge.document_files.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
