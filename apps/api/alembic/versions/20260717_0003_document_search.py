"""Add document metadata, typed identifiers, chunks, and access audit.

Revision ID: 20260717_0003
Revises: 20260713_0002
"""

from collections.abc import Sequence

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260717_0003"
down_revision: str | None = "20260713_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


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
    op.execute("CREATE SCHEMA IF NOT EXISTS audit")
    op.add_column(
        "documents",
        sa.Column(
            "title", sa.Text(), nullable=False, server_default="Untitled document"
        ),
        schema="knowledge",
    )
    for name, type_ in (
        ("description", sa.Text()),
        ("category", sa.Text()),
        ("document_type", sa.Text()),
        ("document_date", sa.Date()),
        ("party_owner", sa.Text()),
        ("location", sa.Text()),
        ("deleted_at", sa.DateTime(timezone=True)),
    ):
        op.add_column("documents", sa.Column(name, type_), schema="knowledge")
    op.add_column(
        "documents",
        sa.Column(
            "tags",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        schema="knowledge",
    )
    op.create_index(
        "ix_documents_metadata_search",
        "documents",
        ["organization_id", "business_id", "title", "category"],
        schema="knowledge",
    )

    op.create_table(
        "document_identifiers",
        *identity_columns(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge.documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("identifier_type", sa.Text(), nullable=False),
        sa.Column("identifier_value", sa.Text(), nullable=False),
        sa.Column("normalized_value", sa.Text(), nullable=False),
        sa.Column("normalization_version", sa.Integer(), nullable=False),
        sa.Column(
            "is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.UniqueConstraint(
            "organization_id",
            "business_id",
            "document_id",
            "identifier_type",
            "identifier_value",
            name="uq_document_identifier_original",
        ),
        schema="knowledge",
    )
    op.create_index(
        "ix_document_identifiers_exact",
        "document_identifiers",
        ["organization_id", "business_id", "identifier_type", "identifier_value"],
        schema="knowledge",
    )
    op.create_index(
        "ix_document_identifiers_normalized",
        "document_identifiers",
        ["organization_id", "business_id", "identifier_type", "normalized_value"],
        schema="knowledge",
    )
    op.execute(
        "CREATE INDEX ix_document_identifiers_prefix ON knowledge.document_identifiers "
        "(organization_id, business_id, identifier_type, "
        "normalized_value text_pattern_ops)"
    )

    op.create_table(
        "document_chunks",
        *identity_columns(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge.documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "document_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge.document_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("page_start", sa.Integer()),
        sa.Column("page_end", sa.Integer()),
        sa.Column("section_label", sa.Text()),
        sa.Column("embedding", Vector(1024)),
        sa.Column("embedding_model", sa.Text()),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.UniqueConstraint(
            "document_version_id", "chunk_index", name="uq_document_chunk_index"
        ),
        schema="knowledge",
    )
    op.create_index(
        "ix_document_chunks_scope",
        "document_chunks",
        ["organization_id", "business_id"],
        schema="knowledge",
    )
    op.create_index(
        "ix_document_chunks_document",
        "document_chunks",
        ["document_id", "document_version_id"],
        schema="knowledge",
    )
    op.execute(
        "CREATE INDEX ix_document_chunks_fts ON knowledge.document_chunks USING gin "
        "(to_tsvector('simple', text))"
    )
    op.execute(
        "CREATE INDEX ix_document_chunks_embedding ON knowledge.document_chunks "
        "USING hnsw (embedding vector_cosine_ops) WHERE embedding IS NOT NULL"
    )

    op.create_table(
        "document_access_events",
        *identity_columns(),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge.documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "document_file_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("knowledge.document_files.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("event_type", sa.Text(), nullable=False),
        schema="audit",
    )
    op.create_index(
        "ix_document_access_events_scope",
        "document_access_events",
        ["organization_id", "business_id", "document_id"],
        schema="audit",
    )


def downgrade() -> None:
    op.drop_table("document_access_events", schema="audit")
    op.drop_table("document_chunks", schema="knowledge")
    op.drop_table("document_identifiers", schema="knowledge")
    op.drop_index(
        "ix_documents_metadata_search", table_name="documents", schema="knowledge"
    )
    for name in (
        "deleted_at",
        "tags",
        "location",
        "party_owner",
        "document_date",
        "document_type",
        "category",
        "description",
        "title",
    ):
        op.drop_column("documents", name, schema="knowledge")
