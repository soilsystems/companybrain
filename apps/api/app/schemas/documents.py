from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class UploadIntentRequest(BaseModel):
    business_id: uuid.UUID
    domain_id: uuid.UUID
    filename: str = Field(min_length=1, max_length=512)
    browser_mime_type: str | None = Field(default=None, max_length=200)
    size_bytes: int = Field(gt=0)


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
