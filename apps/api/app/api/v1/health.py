from __future__ import annotations

from fastapi import APIRouter, Response, status

from app.core.config import get_settings
from app.db.session import database_ready
from app.schemas.health import HealthResponse, ReadinessResponse, VersionResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok", service="companybrain-api", version=settings.app_version
    )


@router.get("/ready", response_model=ReadinessResponse)
async def ready(response: Response) -> ReadinessResponse:
    db_ok = await database_ready()
    if not db_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return ReadinessResponse(
        status="ready" if db_ok else "not_ready", checks={"database": db_ok}
    )


@router.get("/api/v1/version", response_model=VersionResponse)
async def version() -> VersionResponse:
    settings = get_settings()
    return VersionResponse(
        service="companybrain-api",
        version=settings.app_version,
        environment=settings.app_env,
    )
