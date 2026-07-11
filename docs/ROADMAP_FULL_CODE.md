# Full-Code Roadmap

## Phase 1 Foundation

- Clean no-code runtime scaffolding.
- Establish Next.js, FastAPI, worker, database, local Docker, and CI.
- Create core tenant/business/domain schema.
- Implement Supabase JWT verification boundary and `/api/v1/auth/me`.

## Later Phases

- Market Intelligence ingestion and human review.
- Business Deals domain.
- Business Knowledge document upload, extraction, chunking, embeddings, hybrid
  retrieval, and citations.
- AI orchestration with predefined tools and explicit non-answer statuses.

Do not implement later phase domain logic in the foundation.
