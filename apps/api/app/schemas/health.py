from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class ReadinessResponse(BaseModel):
    status: str
    checks: dict[str, bool]


class VersionResponse(BaseModel):
    service: str
    version: str
    environment: str
