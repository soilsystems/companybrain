from __future__ import annotations

from typing import cast

from sqlalchemy import Table

from app.models.base import Base
from app.models.core import Business, BusinessDomain
from app.models.knowledge import (
    DocumentAccessEvent,
    DocumentFile,
    DocumentIdentifier,
    IngestionJob,
    IngestionStatus,
)


def constraint_names(table_name: str) -> set[str]:
    return {
        str(constraint.name)
        for constraint in Base.metadata.tables[f"core.{table_name}"].constraints
        if constraint.name is not None
    }


def test_membership_uniqueness_constraint() -> None:
    assert "uq_memberships_org_business_user" in constraint_names("memberships")


def test_business_to_organization_relationship() -> None:
    foreign_keys = {fk.target_fullname for fk in Business.__table__.foreign_keys}
    assert "core.organizations.id" in foreign_keys


def test_business_domain_enablement_model() -> None:
    assert BusinessDomain.__table__.c.enabled.default is not None
    assert "uq_business_domains_org_business_domain" in constraint_names(
        "business_domains"
    )


def test_ingestion_state_model_covers_observable_pipeline() -> None:
    assert {status.value for status in IngestionStatus} >= {
        "uploaded",
        "validating",
        "converting",
        "ocr_processing",
        "chunking",
        "embedding",
        "ready",
        "failed",
        "cancelled",
    }
    assert IngestionJob.__table__.c.user_error.nullable is True


def test_derivatives_link_to_the_original_file() -> None:
    targets = {fk.target_fullname for fk in DocumentFile.__table__.foreign_keys}
    assert "knowledge.document_files.id" in targets


def test_document_identifiers_are_typed_strings_with_scoped_indexes() -> None:
    assert DocumentIdentifier.__table__.c.identifier_value.type.python_type is str
    assert DocumentIdentifier.__table__.c.normalized_value.type.python_type is str
    table = cast(Table, DocumentIdentifier.__table__)
    indexes = {index.name for index in table.indexes}
    assert "ix_document_identifiers_exact" in indexes
    assert "ix_document_identifiers_normalized" in indexes


def test_document_access_events_are_auditable() -> None:
    assert DocumentAccessEvent.__table__.schema == "audit"
    assert DocumentAccessEvent.__table__.c.event_type.nullable is False
