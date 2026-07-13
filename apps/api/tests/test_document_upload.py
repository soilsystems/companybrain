from __future__ import annotations

import uuid

import httpx
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import app
from app.services.document_ingestion import AuthorizedScope, build_storage_path
from app.services.storage import SupabaseStorage


def test_storage_path_is_scoped_and_ignores_path_traversal() -> None:
    scope = AuthorizedScope(uuid.uuid4(), uuid.uuid4(), uuid.uuid4())
    document_id = uuid.uuid4()
    version_id = uuid.uuid4()
    path = build_storage_path(scope, document_id, version_id, "WhatsApp report 01.JPEG")
    assert path.startswith(
        f"organizations/{scope.organization_id}/businesses/{scope.business_id}/"
    )
    assert f"documents/{document_id}/versions/{version_id}/original/" in path
    assert ".." not in path


async def test_storage_signed_upload_encodes_special_filename() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert "%20" in str(request.url)
        assert request.headers["authorization"] == "Bearer test-service-key"
        return httpx.Response(
            200, json={"url": "/object/upload/sign/test", "token": "short-lived"}
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    storage = SupabaseStorage(
        Settings(
            supabase_url="https://example.supabase.co",
            supabase_service_role_key="test-service-key",
        ),
        client,
    )
    signed = await storage.create_signed_upload("private", "path/report name.jpeg")
    await client.aclose()
    assert signed.token == "short-lived"
    assert signed.url.startswith("https://example.supabase.co/storage/v1/")


async def test_upload_intent_requires_authentication() -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/documents/upload-intents",
            json={
                "business_id": str(uuid.uuid4()),
                "domain_id": str(uuid.uuid4()),
                "filename": "report.jpeg",
                "browser_mime_type": "application/octet-stream",
                "size_bytes": 100,
            },
        )
    assert response.status_code == 401
