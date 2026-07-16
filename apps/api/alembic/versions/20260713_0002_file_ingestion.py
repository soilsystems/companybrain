"""Add auditable file ingestion state.

Revision ID: 20260713_0002
Revises: 20260711_0001
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260713_0002"
down_revision: str | None = "20260711_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

STATUSES = (
    "uploaded",
    "validating",
    "accepted",
    "rejected",
    "queued",
    "converting",
    "extracting",
    "ocr_processing",
    "chunking",
    "embedding",
    "ready",
    "partially_processed",
    "failed",
    "cancelled",
)


def identity_columns() -> list[sa.Column]:
    return [
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    ]


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS knowledge")
    status = postgresql.ENUM(
        *STATUSES,
        name="ingestion_status",
        schema="knowledge",
        create_type=False,
    )
    kind = postgresql.ENUM(
        "original",
        "derivative",
        "extraction",
        "preview",
        name="document_file_kind",
        schema="knowledge",
        create_type=False,
    )
    status.create(op.get_bind(), checkfirst=True)
    kind.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "documents",
        *identity_columns(),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "business_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.businesses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "domain_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.domains.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("status", status, nullable=False, server_default="uploaded"),
        schema="knowledge",
    )
    op.create_index(
        "ix_documents_scope",
        "documents",
        ["organization_id", "business_id", "domain_id"],
        schema="knowledge",
    )
    op.create_table(
        "document_versions",
        *identity_columns(),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge.documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("status", status, nullable=False, server_default="uploaded"),
        sa.Column("processing_started_at", sa.DateTime(timezone=True)),
        sa.Column("processing_finished_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint(
            "document_id", "version_number", name="uq_document_version"
        ),
        schema="knowledge",
    )
    op.create_index(
        "ix_document_versions_scope",
        "document_versions",
        ["organization_id", "business_id"],
        schema="knowledge",
    )
    op.create_table(
        "document_files",
        *identity_columns(),
        sa.Column(
            "document_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge.document_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "source_file_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge.document_files.id", ondelete="RESTRICT"),
        ),
        sa.Column("kind", kind, nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=False),
        sa.Column("safe_filename", sa.Text(), nullable=False),
        sa.Column("storage_bucket", sa.Text(), nullable=False),
        sa.Column("storage_object", sa.Text(), nullable=False, unique=True),
        sa.Column("browser_mime_type", sa.Text()),
        sa.Column("detected_mime_type", sa.Text()),
        sa.Column("normalized_mime_type", sa.Text()),
        sa.Column("checksum_sha256", sa.Text()),
        sa.Column("size_bytes", sa.BigInteger()),
        sa.Column("extension_matches", sa.Boolean()),
        sa.Column("converter_name", sa.Text()),
        sa.Column("converter_version", sa.Text()),
        sa.Column(
            "metadata_json",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        schema="knowledge",
    )
    op.create_index(
        "ix_document_files_scope",
        "document_files",
        ["organization_id", "business_id"],
        schema="knowledge",
    )
    op.create_index(
        "ix_document_files_version",
        "document_files",
        ["document_version_id"],
        schema="knowledge",
    )
    op.create_table(
        "ingestion_jobs",
        *identity_columns(),
        sa.Column(
            "document_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge.document_versions.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", status, nullable=False, server_default="queued"),
        sa.Column("selected_processor", sa.Text()),
        sa.Column("fallback_processor", sa.Text()),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_code", sa.Text()),
        sa.Column("user_error", sa.Text()),
        sa.Column("internal_error", sa.Text()),
        sa.Column("queued_at", sa.DateTime(timezone=True)),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("cancelled_at", sa.DateTime(timezone=True)),
        schema="knowledge",
    )
    op.create_index(
        "ix_ingestion_jobs_scope",
        "ingestion_jobs",
        ["organization_id", "business_id", "status"],
        schema="knowledge",
    )
    op.create_table(
        "ingestion_attempts",
        *identity_columns(),
        sa.Column(
            "ingestion_job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge.ingestion_jobs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("processor", sa.Text(), nullable=False),
        sa.Column("status", status, nullable=False),
        sa.Column("error_code", sa.Text()),
        sa.Column("internal_error", sa.Text()),
        sa.Column(
            "retryable", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint(
            "ingestion_job_id", "attempt_number", name="uq_job_attempt"
        ),
        schema="knowledge",
    )
    op.create_index(
        "ix_ingestion_attempts_job",
        "ingestion_attempts",
        ["ingestion_job_id"],
        schema="knowledge",
    )


def downgrade() -> None:
    for table in (
        "ingestion_attempts",
        "ingestion_jobs",
        "document_files",
        "document_versions",
        "documents",
    ):
        op.drop_table(table, schema="knowledge")
    sa.Enum(name="document_file_kind", schema="knowledge").drop(
        op.get_bind(), checkfirst=True
    )
    sa.Enum(name="ingestion_status", schema="knowledge").drop(
        op.get_bind(), checkfirst=True
    )
    sa.Enum(name="ingestion_status", schema="knowledge").drop(
        op.get_bind(), checkfirst=True
    )
