# Company Brain

Company Brain is a multi-tenant, multi-business, multi-domain business
intelligence and knowledge platform. Users choose an organization, business
workspace, and domain, then ask questions that must be answered only from
authorized structured data or authorized document evidence.

## Approved Stack

- Next.js, TypeScript, Tailwind CSS
- FastAPI, Python 3.12, Pydantic
- Supabase PostgreSQL, Supabase Auth, Supabase Storage, pgvector
- SQLAlchemy 2.x and Alembic
- Dramatiq and Redis
- OpenAI Responses API and embeddings
- Google Document AI
- Docker Compose and GitHub Actions

## Repository Structure

- `apps/web` - Next.js frontend
- `apps/api` - trusted FastAPI backend and Alembic migrations
- `apps/worker` - Dramatiq worker entry points
- `packages/*` - shared UI, API client, and TypeScript types
- `database` - seeds, policies, migration-adjacent docs
- `ai` - future domain, prompt, tool, schema, and eval assets
- `testing` - shared fixtures and future integration/security tests
- `docs` - active architecture, runbooks, roadmap, and legacy inventory

See `docs/architecture/REPOSITORY_STRUCTURE.md` for details.

## File ingestion

The ingestion gateway detects file formats from content in FastAPI, records MIME
mismatches, selects native parsing/OCR/conversion through a central router, and maps
provider failures to safe user messages. Supported initial formats are PDF, JPEG/JPG,
PNG, WebP, TIFF, DOCX, XLSX, XLS, CSV, TXT, JSON, and PPTX. Executables,
macro-enabled files, encrypted files, corrupt files, and unknown formats are rejected
clearly.

See `docs/architecture/FILE_INGESTION_ARCHITECTURE.md` and
`docs/testing/FILE_INGESTION_TEST_MATRIX.md` for routing, limits, and test coverage.

## Document search and records UI

The application opens on a document-search-first dashboard. Users can preserve and
search survey numbers such as `289/2` or `104/A`, upload records to private storage,
inspect processing state, request short-lived view/download URLs, and ask questions
grounded in one authorized document. Exact identifier and metadata search remain
available even when extraction or embeddings are unavailable.

Routes: `/app`, `/app/search`, `/app/documents`, `/app/documents/upload`,
`/app/documents/[documentId]`, `/app/chat`, and `/app/settings`.

See `docs/runbooks/DOCUMENT_UPLOAD_AND_SEARCH.md` for setup and manual verification.

## Local Setup

```bash
make setup
cp .env.example .env
docker compose up postgres redis
make migrate
make seed
make api
make web
```

The Next.js app runs locally through pnpm (`make web`) rather than Docker. The
API and worker can run either locally through `uv` or through Docker Compose. Set
`NEXT_PUBLIC_DEFAULT_BUSINESS_ID` and `NEXT_PUBLIC_DEFAULT_DOMAIN_ID` only when a
specific authorized scope should be selected by default.

## Commands

- `make setup`
- `make dev`
- `make api`
- `make web`
- `make worker`
- `make migrate`
- `make migration`
- `make seed`
- `make test`
- `make lint`
- `make typecheck`
- `make format`

## Current Phase

Phase 1 foundation plus file ingestion, typed document identifiers, hybrid document
search, secure document actions, a reference-based records UI, and asynchronous
extraction/chunking/embedding. Production provider credentials and a migrated
Supabase environment are required for live OCR and semantic retrieval.

Primary references:

- `ARCHITECTURE.md`
- `AGENTS.md`
- `docs/ROADMAP_FULL_CODE.md`
