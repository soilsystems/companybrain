from __future__ import annotations

from app.broker import health_check_actor


def test_health_check_actor_is_registered() -> None:
    assert health_check_actor.actor_name == "health_check_actor"
