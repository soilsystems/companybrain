# Repository Structure

Company Brain is now a full-code monorepo.

```text
apps/web        Next.js App Router frontend
apps/api        FastAPI trusted backend, SQLAlchemy models, Alembic migrations
apps/worker     Dramatiq actors and worker configuration
packages/ui     Shared frontend UI package placeholder
packages/api-client
packages/shared-types
database        Seeds, policies, and database-facing docs
ai              Future domain registries, prompts, tools, schemas, evals
testing         Cross-service fixtures, integration, security, AI eval tests
infrastructure  Docker, GitHub, deployment assets
docs            Active docs and legacy no-code archive
```

Reusable Python domain logic should be shared by importable modules under
`apps/api/app/services` until enough duplication exists to justify a separate
package. There is no duplicate `backend/` Python package.
