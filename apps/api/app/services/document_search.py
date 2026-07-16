from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import and_, case, exists, func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.models.base import RecordStatus
from app.models.core import Membership, User
from app.models.knowledge import Document, DocumentChunk, DocumentIdentifier
from app.services.document_identifiers import normalize_identifier


@dataclass(frozen=True)
class RankedDocument:
    document: Document
    score: float
    match_type: str
    match_reason: str
    snippet: str | None


def rank_match(
    *,
    exact_original: bool = False,
    exact_normalized: bool = False,
    exact_alternate: bool = False,
    identifier_prefix: bool = False,
    metadata_exact: bool = False,
    full_text_score: float = 0.0,
    semantic_score: float = 0.0,
) -> tuple[float, str]:
    if exact_original:
        return 1000.0, "exact_identifier"
    if exact_normalized:
        return 900.0, "normalized_identifier"
    if exact_alternate:
        return 800.0, "alternate_identifier"
    if identifier_prefix:
        return 700.0, "identifier_prefix"
    if metadata_exact:
        return 600.0, "metadata"
    if full_text_score > 0:
        return 400.0 + full_text_score, "full_text"
    if semantic_score > 0:
        return 200.0 + semantic_score, "semantic"
    return 0.0, "none"


async def search_documents(
    session: AsyncSession,
    user: User,
    *,
    query: str,
    business_id: uuid.UUID,
    domain_id: uuid.UUID | None,
    status: str | None,
    category: str | None,
    document_type: str | None,
    page: int,
    page_size: int,
    query_embedding: list[float] | None = None,
    search_content: bool = True,
) -> tuple[int, list[RankedDocument]]:
    normalized = normalize_identifier(query)
    identifier_scope = and_(
        DocumentIdentifier.document_id == Document.id,
        DocumentIdentifier.organization_id == Document.organization_id,
        DocumentIdentifier.business_id == Document.business_id,
    )
    exact_original = exists().where(
        identifier_scope,
        DocumentIdentifier.identifier_value == query.strip(),
    )
    exact_normalized = exists().where(
        identifier_scope,
        DocumentIdentifier.normalized_value == normalized,
        DocumentIdentifier.identifier_type == "survey_number",
    )
    exact_alternate = exists().where(
        identifier_scope,
        DocumentIdentifier.normalized_value == normalized,
        DocumentIdentifier.identifier_type != "survey_number",
    )
    prefix = exists().where(
        identifier_scope,
        DocumentIdentifier.normalized_value.startswith(normalized),
    )
    metadata_exact = or_(
        func.lower(Document.title) == query.strip().lower(),
        func.lower(Document.display_name) == query.strip().lower(),
    )
    metadata_partial = or_(
        Document.title.ilike(f"%{query}%"),
        Document.display_name.ilike(f"%{query}%"),
    )
    fts_query = func.websearch_to_tsquery("simple", query)
    full_text: ColumnElement[bool] = literal(False)
    if search_content:
        full_text = exists().where(
            DocumentChunk.document_id == Document.id,
            func.to_tsvector("simple", DocumentChunk.text).op("@@")(fts_query),
        )
    semantic_score: ColumnElement[Any] = literal(0.0)
    semantic_match: ColumnElement[bool] = literal(False)
    if search_content and query_embedding:
        semantic_score = (
            select(
                func.max(1 - DocumentChunk.embedding.cosine_distance(query_embedding))
            )
            .where(
                DocumentChunk.document_id == Document.id,
                DocumentChunk.embedding.is_not(None),
            )
            .correlate(Document)
            .scalar_subquery()
        )
        semantic_match = func.coalesce(semantic_score, 0.0) >= 0.55

    score = case(
        (exact_original, 1000.0),
        (exact_normalized, 900.0),
        (exact_alternate, 800.0),
        (prefix, 700.0),
        (metadata_exact, 600.0),
        (metadata_partial, 500.0),
        (full_text, 400.0),
        (semantic_match, 200.0 + func.coalesce(semantic_score, 0.0)),
        else_=0.0,
    ).label("score")
    match_type = case(
        (exact_original, "exact_identifier"),
        (exact_normalized, "normalized_identifier"),
        (exact_alternate, "alternate_identifier"),
        (prefix, "identifier_prefix"),
        (metadata_exact, "metadata_exact"),
        (metadata_partial, "metadata"),
        (full_text, "full_text"),
        (semantic_match, "semantic"),
        else_="none",
    ).label("match_type")

    filters = [
        Membership.user_id == user.id,
        Membership.status == RecordStatus.active,
        Membership.organization_id == Document.organization_id,
        Membership.business_id == Document.business_id,
        Document.business_id == business_id,
        Document.deleted_at.is_(None),
        or_(
            exact_original,
            exact_normalized,
            exact_alternate,
            prefix,
            metadata_exact,
            metadata_partial,
            full_text,
            semantic_match,
        ),
    ]
    if domain_id:
        filters.append(Document.domain_id == domain_id)
    if status:
        filters.append(Document.status == status)
    if category:
        filters.append(Document.category == category)
    if document_type:
        filters.append(Document.document_type == document_type)

    total = await session.scalar(
        select(func.count(func.distinct(Document.id)))
        .select_from(Document)
        .join(Membership, Membership.business_id == Document.business_id)
        .where(*filters)
    )
    rows = await session.execute(
        select(Document, score, match_type)
        .join(Membership, Membership.business_id == Document.business_id)
        .where(*filters)
        .distinct()
        .order_by(score.desc(), Document.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    results = [
        RankedDocument(
            document=row[0],
            score=float(row[1]),
            match_type=str(row[2]),
            match_reason=str(row[2]).replace("_", " "),
            snippet=row[0].description,
        )
        for row in rows.all()
    ]
    return int(total or 0), results
