FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /worker
COPY apps/worker/pyproject.toml ./
RUN uv sync --no-dev || uv sync
COPY apps/worker .
CMD ["uv", "run", "dramatiq", "app.broker"]
