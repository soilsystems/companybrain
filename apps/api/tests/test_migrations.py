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


def test_ingestion_migration_reuses_explicit_postgres_enums() -> None:
    migration = (MIGRATIONS / "20260713_0002_file_ingestion.py").read_text()
    assert 'name="ingestion_status"' in migration
    assert 'name="document_file_kind"' in migration
    assert migration.count("create_type=False") == 2
    assert 'sa.Enum(name="ingestion_status"' in migration


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
