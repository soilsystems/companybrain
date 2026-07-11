from __future__ import annotations

from pathlib import Path


def test_initial_migration_creates_core_tables() -> None:
    migration = Path("alembic/versions/20260711_0001_core_foundation.py").read_text()
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
