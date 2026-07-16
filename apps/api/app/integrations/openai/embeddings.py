from __future__ import annotations

import httpx

from app.core.config import Settings


class EmbeddingUnavailable(RuntimeError):
    pass


class OpenAIEmbeddingClient:
    def __init__(
        self, settings: Settings, client: httpx.AsyncClient | None = None
    ) -> None:
        self.settings = settings
        self.client = client or httpx.AsyncClient(timeout=20)

    async def embed_query(self, text: str) -> list[float] | None:
        embeddings = await self.embed_documents([text])
        return embeddings[0] if embeddings else None

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not self.settings.openai_api_key:
            return []
        response = await self.client.post(
            "https://api.openai.com/v1/embeddings",
            headers={"authorization": f"Bearer {self.settings.openai_api_key}"},
            json={
                "model": self.settings.embedding_model,
                "input": texts,
                "dimensions": self.settings.embedding_dimensions,
            },
        )
        if response.status_code >= 400:
            raise EmbeddingUnavailable("query_embedding_failed")
        data = response.json().get("data") or []
        if len(data) != len(texts):
            raise EmbeddingUnavailable("invalid_embedding_response")
        return [
            [float(value) for value in item["embedding"]]
            for item in sorted(data, key=lambda item: int(item["index"]))
        ]
