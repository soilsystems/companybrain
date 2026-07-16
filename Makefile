SHELL := /usr/bin/env bash

.PHONY: setup dev api web worker migrate migration seed test lint typecheck format

setup:
	corepack enable
	corepack prepare pnpm@9.15.4 --activate
	pnpm install
	cd apps/api && uv sync
	cd apps/worker && uv sync

dev:
	docker compose up postgres redis api worker

api:
	cd apps/api && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

web:
	pnpm --filter @companybrain/web dev

worker:
	cd apps/api && uv run dramatiq app.jobs.document_ingestion

migrate:
	cd apps/api && uv run alembic upgrade head

migration:
	cd apps/api && uv run alembic revision --autogenerate -m "$${MESSAGE:-schema change}"

seed:
	cd apps/api && uv run python -m app.scripts.seed_core

test:
	cd apps/api && uv run pytest
	pnpm --filter @companybrain/web test

lint:
	cd apps/api && uv run ruff check .
	cd apps/api && uv run black --check .
	pnpm --filter @companybrain/web lint

typecheck:
	cd apps/api && uv run mypy app tests
	pnpm --filter @companybrain/web typecheck

format:
	cd apps/api && uv run ruff check --fix .
	cd apps/api && uv run black .
	pnpm --filter @companybrain/web format
