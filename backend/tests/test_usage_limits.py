from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.auth import AppRole, Principal
from app.services import usage_limits


def _app(scope: str) -> FastAPI:
    app = FastAPI()

    @app.get("/limited", dependencies=[Depends(usage_limits.usage_limit(scope))])
    async def limited():
        return {"ok": True}

    return app


def setup_function():
    usage_limits._hits.clear()


def test_non_admin_is_rate_limited(monkeypatch):
    monkeypatch.setitem(
        usage_limits.RULES,
        "test",
        {
            "anonymous": usage_limits.LimitRule(1, 60, 10),
            "viewer": usage_limits.LimitRule(1, 60, 2),
            "analyst": usage_limits.LimitRule(1, 60, 10),
        },
    )

    with TestClient(_app("test")) as client:
        assert client.get("/limited").status_code == 200
        response = client.get("/limited")

    assert response.status_code == 429
    assert "Retry-After" in response.headers


def test_admin_bypasses_limit_but_gets_warning(monkeypatch):
    monkeypatch.setitem(
        usage_limits.RULES,
        "test-admin",
        {
            "anonymous": usage_limits.LimitRule(1, 60, 10),
            "viewer": usage_limits.LimitRule(1, 60, 2),
            "analyst": usage_limits.LimitRule(1, 60, 10),
        },
    )

    async def admin_principal(_authorization: str):
        return Principal(user_id="admin-1", role=AppRole.ADMIN)

    monkeypatch.setattr(usage_limits, "get_current_principal", admin_principal)

    with TestClient(_app("test-admin")) as client:
        first = client.get("/limited", headers={"Authorization": "Bearer token"})
        second = client.get("/limited", headers={"Authorization": "Bearer token"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert "Admin bypass active" in second.headers["X-Usage-Warning"]
