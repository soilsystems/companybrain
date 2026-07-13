from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import quote

import httpx

from app.core.config import Settings


@dataclass(frozen=True)
class SignedUpload:
    url: str
    token: str


class StorageError(RuntimeError):
    pass


class SupabaseStorage:
    def __init__(
        self, settings: Settings, client: httpx.AsyncClient | None = None
    ) -> None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise StorageError("storage_not_configured")
        self.base_url = settings.supabase_url.rstrip("/")
        self.service_key = settings.supabase_service_role_key
        self.client = client or httpx.AsyncClient(timeout=60)

    @property
    def headers(self) -> dict[str, str]:
        return {
            "authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key,
        }

    async def create_signed_upload(self, bucket: str, object_path: str) -> SignedUpload:
        encoded = quote(object_path, safe="/")
        response = await self.client.post(
            f"{self.base_url}/storage/v1/object/upload/sign/{bucket}/{encoded}",
            headers=self.headers,
        )
        if response.status_code >= 400:
            raise StorageError("signed_upload_failed")
        payload = response.json()
        signed_path = str(payload.get("url") or payload.get("signedURL") or "")
        token = str(payload.get("token") or "")
        if not signed_path:
            raise StorageError("invalid_signed_upload_response")
        url = (
            signed_path
            if signed_path.startswith("http")
            else f"{self.base_url}/storage/v1{signed_path}"
        )
        return SignedUpload(url=url, token=token)

    async def download(self, bucket: str, object_path: str) -> bytes:
        encoded = quote(object_path, safe="/")
        response = await self.client.get(
            f"{self.base_url}/storage/v1/object/authenticated/{bucket}/{encoded}",
            headers=self.headers,
        )
        if response.status_code == 404:
            raise StorageError("object_not_found")
        if response.status_code >= 400:
            raise StorageError("storage_download_failed")
        return response.content
