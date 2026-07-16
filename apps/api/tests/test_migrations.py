from __future__ import annotations

from pathlib import Path

MIGRATIONS = Path(__file__).parents[1] / "alembic" / "versions"


def test_initial_migration_creates_core_tables() -> None:
    migration = (MIGRATIONS / "20260711_0001_core_foundation.py").read_text()
    for table in [
        "organizations",
        "businesses",
        "users",
        "memberships",
        "domains",
        "business_domains",
    ]:
        assert table in migration


def test_database_session_initialization() -> None:
    from app.db.session import AsyncSessionLocal, engine

    assert engine is not None
    assert AsyncSessionLocal is not None


def test_document_search_migration_has_identifiers_indexes_and_audit() -> None:
    migration = (MIGRATIONS / "20260717_0003_document_search.py").read_text()
    for expected in [
        "document_identifiers",
        "identifier_value",
        "normalized_value",
        "text_pattern_ops",
        "document_chunks",
        "vector_cosine_ops",
        "document_access_events",
    ]:
        assert expected in migration
