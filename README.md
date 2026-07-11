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

Phase 1 foundation only. The repository establishes the runnable monorepo,
tenant/business/domain schema, auth verification boundary, local development,
and CI. It intentionally does not implement market intelligence, deals,
document ingestion/RAG, embeddings, or chat orchestration.

Primary references:

- `ARCHITECTURE.md`
- `AGENTS.md`
- `docs/ROADMAP_FULL_CODE.md`
