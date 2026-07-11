from __future__ import annotations

import dramatiq
import structlog
from dramatiq.brokers.redis import RedisBroker

from app.config import get_settings

settings = get_settings()
redis_broker = RedisBroker(url=settings.redis_url)  # type: ignore[no-untyped-call]
dramatiq.set_broker(redis_broker)

logger = structlog.get_logger()


@dramatiq.actor(max_retries=3, min_backoff=1000, max_backoff=30000)
def health_check_actor(job_id: str) -> dict[str, str]:
    """Tiny actor used to verify broker wiring during local setup."""
    logger.info("worker_health_check", job_id=job_id)
    return {"status": "ok", "job_id": job_id}
