from __future__ import annotations

import uuid
from typing import Any

import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from pytest import MonkeyPatch

from app.core.config import Settings
from app.main import app
from app.services.auth import extract_bearer_token, verify_supabase_jwt


def test_extract_bearer_token_rejects_missing_header() -> None:
    with pytest.raises(HTTPException) as exc:
        extract_bearer_token(None)
    assert exc.value.status_code == 401


async def test_verify_supabase_jwt_with_mock(monkeypatch: MonkeyPatch) -> None:
    subject = uuid.uuid4()

    def fake_decode(*args: Any, **kwargs: Any) -> dict[str, str]:
        return {"sub": str(subject), "email": "person@example.com"}

    monkeypatch.setattr("app.services.auth.jwt.decode", fake_decode)
    identity = await verify_supabase_jwt(
        "token", Settings(supabase_jwt_secret="secret")
    )

    assert identity.supabase_user_id == subject
    assert identity.email == "person@example.com"


async def test_auth_me_rejects_unauthorized_request() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/auth/me")

    assert response.status_code == 401


async def test_auth_me_with_dependency_override() -> None:
    user_id = uuid.uuid4()

    class FakeUser:
        id = user_id
        supabase_user_id = uuid.uuid4()
        email = "person@example.com"
        display_name = "Person"
        status = type("Status", (), {"value": "active"})()

    class FakeResult:
        def all(self) -> list[object]:
            return []

    class FakeSession:
        async def execute(self, statement: object) -> FakeResult:
            return FakeResult()

    from app.db.session import get_db_session
    from app.services.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: FakeUser()
    app.dependency_overrides[get_db_session] = lambda: FakeSession()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get(
            "/api/v1/auth/me", headers={"authorization": "Bearer test"}
        )

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "person@example.com"
