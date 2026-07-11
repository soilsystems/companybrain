# Local Development

The local stack uses Docker Compose for PostgreSQL and Redis. The frontend runs
with pnpm outside Docker for fast iteration.

Prerequisites:

- Node.js with Corepack
- pnpm 9
- uv
- Docker

Common flow:

```bash
make setup
cp .env.example .env
docker compose up postgres redis
make migrate
make seed
make api
make worker
make web
```

`make dev` starts PostgreSQL, Redis, API, and worker containers. Use separate
local commands when you want hot reload.
