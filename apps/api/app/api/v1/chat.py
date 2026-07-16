from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.models.core import User
from app.models.knowledge import DocumentChunk
from app.schemas.chat import (
    ChatCitation,
    ChatDocumentAction,
    DocumentChatRequest,
    DocumentChatResponse,
)
from app.services.auth import get_current_user
from app.services.document_identifiers import parse_survey_query
from app.services.document_search import RankedDocument, search_documents

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


async def evidence_chunks(
    session: AsyncSession, document_id: uuid.UUID, question: str
) -> list[DocumentChunk]:
    query = func.websearch_to_tsquery("simple", question)
    ranked = await session.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(
            func.ts_rank_cd(
                func.to_tsvector("simple", DocumentChunk.text), query
            ).desc(),
            DocumentChunk.chunk_index,
        )
        .limit(5)
    )
    return list(ranked.scalars())


def action(result: RankedDocument, survey: str | None) -> ChatDocumentAction:
    return ChatDocumentAction(
        document_id=result.document.id,
        title=result.document.title,
        survey_number=survey,
        view_path=f"/app/documents/{result.document.id}",
        download_path=f"/app/documents/{result.document.id}?download=true",
    )


@router.post("/query", response_model=DocumentChatResponse)
async def document_question(
    payload: DocumentChatRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentChatResponse:
    parsed = parse_survey_query(payload.question)
    search_query = parsed.original if parsed else payload.question
    _total, matches = await search_documents(
        session,
        current_user,
        query=search_query,
        business_id=payload.business_id,
        domain_id=payload.domain_id,
        status=None,
        category=None,
        document_type=None,
        page=1,
        page_size=10,
    )
    if payload.document_id:
        matches = [item for item in matches if item.document.id == payload.document_id]
    exact = [
        item
        for item in matches
        if item.match_type in {"exact_identifier", "normalized_identifier"}
    ]
    candidates = exact or matches
    if not candidates:
        label = f" with survey number {parsed.original}" if parsed else ""
        return DocumentChatResponse(
            status="not_found",
            answer=f"I could not find an authorized document{label} in this workspace.",
            citations=[],
            documents=[],
        )
    if parsed and len(exact) > 1 and payload.document_id is None:
        return DocumentChatResponse(
            status="clarification_required",
            answer=(
                f"I found {len(exact)} authorized documents for survey "
                f"{parsed.original}. "
                "Choose one document before asking for its contents."
            ),
            citations=[],
            documents=[action(item, parsed.original) for item in exact],
        )

    selected = candidates[0]
    chunks = await evidence_chunks(session, selected.document.id, payload.question)
    document_action = action(selected, parsed.original if parsed else None)
    if not chunks:
        return DocumentChatResponse(
            status="partial",
            answer=(
                f"I found {selected.document.title}, but its searchable content is not "
                "indexed yet. You can view or download the original document."
            ),
            citations=[],
            documents=[document_action],
        )
    citations = [
        ChatCitation(
            document_id=selected.document.id,
            document_title=selected.document.title,
            chunk_id=chunk.id,
            page_start=chunk.page_start,
            page_end=chunk.page_end,
            section_label=chunk.section_label,
            excerpt=chunk.text[:600],
        )
        for chunk in chunks
    ]
    evidence = "\n\n".join(
        f"[{index}] {citation.excerpt}" for index, citation in enumerate(citations, 1)
    )
    return DocumentChatResponse(
        status="answered",
        answer=(
            f"The authorized record {selected.document.title} contains the following "
            f"relevant evidence:\n\n{evidence}"
        ),
        citations=citations,
        documents=[document_action],
    )
