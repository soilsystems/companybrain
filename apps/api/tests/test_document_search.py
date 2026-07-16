from __future__ import annotations

import uuid

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import app
from app.schemas.documents import UploadIntentRequest
from app.services.document_identifiers import (
    NORMALIZATION_VERSION,
    normalize_identifier,
    parse_survey_query,
)
from app.services.document_search import rank_match
from app.services.storage import SupabaseStorage


@pytest.mark.parametrize(
    ("value", "normalized"),
    [
        ("288", "288"),
        (" 288", "288"),
        ("288 ", "288"),
        ("289/2", "289/2"),
        ("289 / 2", "289/2"),
        ("289／2", "289/2"),
        ("104/A", "104/a"),
        ("104 / A", "104/a"),
        ("15-3", "15-3"),
        ("15 / 3", "15/3"),
        ("Survey 288", "survey 288"),
    ],
)
def test_conservative_identifier_normalization(value: str, normalized: str) -> None:
    assert normalize_identifier(value) == normalized


def test_distinct_survey_numbers_remain_distinct() -> None:
    assert normalize_identifier("289/2") != normalize_identifier("289/20")
    assert normalize_identifier("15-3") != normalize_identifier("15/3")


def test_survey_query_parser_extracts_identifier_without_rewriting_question() -> None:
    parsed = parse_survey_query("What does survey 289 / 2 say about ownership?")
    assert parsed is not None
    assert parsed.original == "289 / 2"
    assert parsed.normalized == "289/2"


def test_exact_identifier_ranks_above_all_retrieval_modes() -> None:
    exact, exact_type = rank_match(exact_original=True, semantic_score=0.99)
    normalized, _ = rank_match(exact_normalized=True, full_text_score=1.0)
    prefix, _ = rank_match(identifier_prefix=True)
    full_text, _ = rank_match(full_text_score=0.9)
    semantic, semantic_type = rank_match(semantic_score=0.99)
    assert exact > normalized > prefix > full_text > semantic
    assert exact_type == "exact_identifier"
    assert semantic_type == "semantic"


def test_upload_schema_preserves_original_survey_number() -> None:
    payload = UploadIntentRequest(
        business_id=uuid.uuid4(),
        domain_id=uuid.uuid4(),
        filename="record.pdf",
        browser_mime_type="application/pdf",
        size_bytes=100,
        survey_number=" 104 / A ",
        title="Ownership record",
    )
    assert payload.survey_number == " 104 / A "
    assert NORMALIZATION_VERSION == 1


def test_upload_schema_allows_name_only_documents() -> None:
    payload = UploadIntentRequest(
        business_id=uuid.uuid4(),
        domain_id=uuid.uuid4(),
        filename="Quarterly Report.pdf",
        size_bytes=100,
        title="Quarterly Report",
    )
    assert payload.survey_number is None


async def test_signed_download_is_short_lived_and_sets_filename() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/private/path/record.pdf")
        assert request.headers["authorization"] == "Bearer service-key"
        assert request.content
        return httpx.Response(
            200,
            json={"signedURL": "/storage/v1/object/sign/path/record name.pdf?token=x"},
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    storage = SupabaseStorage(
        Settings(
            supabase_url="https://example.supabase.co",
            supabase_service_role_key="service-key",
        ),
        client,
    )
    signed = await storage.create_signed_object_url(
        "private", "path/record.pdf", 300, download_filename="record.pdf"
    )
    await client.aclose()
    assert signed.url == (
        "https://example.supabase.co/storage/v1/object/sign/path/"
        "record%20name.pdf?token=x"
    )


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", f"/api/v1/documents/search?q=288&business_id={uuid.uuid4()}"),
        ("GET", f"/api/v1/documents?business_id={uuid.uuid4()}"),
        ("GET", f"/api/v1/documents/{uuid.uuid4()}"),
        ("POST", f"/api/v1/documents/{uuid.uuid4()}/view-url"),
        ("POST", f"/api/v1/documents/{uuid.uuid4()}/download-url"),
        ("POST", "/api/v1/chat/query"),
    ],
)
async def test_document_routes_reject_unauthenticated_access(
    method: str, path: str
) -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        if path == "/api/v1/chat/query":
            response = await client.request(
                method,
                path,
                json={
                    "business_id": str(uuid.uuid4()),
                    "question": "Show survey 288",
                },
            )
        else:
            response = await client.request(method, path)
    assert response.status_code == 401
