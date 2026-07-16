from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class UploadIntentRequest(BaseModel):
    business_id: uuid.UUID
    domain_id: uuid.UUID
    filename: str = Field(min_length=1, max_length=512)
    browser_mime_type: str | None = Field(default=None, max_length=200)
    size_bytes: int = Field(gt=0)
    survey_number: str | None = Field(default=None, min_length=1, max_length=200)
    title: str | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, max_length=200)
    document_type: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    document_date: date | None = None
    party_owner: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=500)
    tags: list[str] = Field(default_factory=list, max_length=25)


class UploadIntentResponse(BaseModel):
    document_id: uuid.UUID
    document_version_id: uuid.UUID
    document_file_id: uuid.UUID
    upload_url: str
    upload_token: str
    expires_in_seconds: int


class ConfirmUploadRequest(BaseModel):
    document_file_id: uuid.UUID


class DocumentStatusResponse(BaseModel):
    document_id: uuid.UUID
    filename: str
    status: str
    detected_mime_type: str | None
    extension_matches: bool | None
    processor: str | None
    attempt_count: int
    error_code: str | None
    user_message: str | None
    updated_at: datetime


class DocumentIdentifierResponse(BaseModel):
    type: str
    value: str
    normalized_value: str
    is_primary: bool


class DocumentSearchResult(BaseModel):
    document_id: uuid.UUID
    title: str
    survey_number: str | None
    alternate_identifiers: list[DocumentIdentifierResponse]
    description: str | None
    category: str | None
    document_type: str | None
    document_date: date | None
    party_owner: str | None
    location: str | None
    tags: list[str]
    original_filename: str | None
    match_type: str
    match_reason: str
    highlighted_snippet: str | None
    score: float
    processing_status: str
    can_view: bool
    can_download: bool
    updated_at: datetime


class DocumentSearchResponse(BaseModel):
    query: str
    page: int
    page_size: int
    total: int
    results: list[DocumentSearchResult]


class DocumentDetailResponse(BaseModel):
    document_id: uuid.UUID
    title: str
    display_name: str
    description: str | None
    category: str | None
    document_type: str | None
    document_date: date | None
    party_owner: str | None
    location: str | None
    tags: list[str]
    identifiers: list[DocumentIdentifierResponse]
    processing_status: str
    original_filename: str | None
    normalized_mime_type: str | None
    size_bytes: int | None
    version_number: int
    can_view: bool
    can_download: bool
    created_at: datetime
    updated_at: datetime


class SignedDocumentUrlResponse(BaseModel):
    url: str
    expires_in_seconds: int
