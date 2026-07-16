from __future__ import annotations

import uuid

from pydantic import BaseModel, Field


class DocumentChatRequest(BaseModel):
    business_id: uuid.UUID
    domain_id: uuid.UUID | None = None
    question: str = Field(min_length=1, max_length=4000)
    document_id: uuid.UUID | None = None


class ChatCitation(BaseModel):
    document_id: uuid.UUID
    document_title: str
    chunk_id: uuid.UUID
    page_start: int | None
    page_end: int | None
    section_label: str | None
    excerpt: str


class ChatDocumentAction(BaseModel):
    document_id: uuid.UUID
    title: str
    survey_number: str | None
    view_path: str
    download_path: str


class DocumentChatResponse(BaseModel):
    status: str
    answer: str
    citations: list[ChatCitation]
    documents: list[ChatDocumentAction]
