from __future__ import annotations

from httpx import ASGITransport, AsyncClient
from pytest import MonkeyPatch

from app.main import app


async def test_health_endpoint() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_readiness_unavailable_when_database_fails(
    monkeypatch: MonkeyPatch,
) -> None:
    async def fake_database_ready() -> bool:
        return False

    monkeypatch.setattr("app.api.v1.health.database_ready", fake_database_ready)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/ready")

    assert response.status_code == 503
    assert response.json() == {"status": "not_ready", "checks": {"database": False}}


async def test_version_endpoint() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/version")

    assert response.status_code == 200
    assert response.json()["service"] == "companybrain-api"
