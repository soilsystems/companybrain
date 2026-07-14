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
API and worker can run either locally through `uv` or through Docker Compose.

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

Phase 1 foundation plus the file inspection, routing, conversion, parser, provider
capability, and ingestion persistence foundations. Durable extraction workers,
retrieval, embeddings, and production chat orchestration remain under development.

Primary references:

- `ARCHITECTURE.md`
- `AGENTS.md`
- `docs/ROADMAP_FULL_CODE.md`
