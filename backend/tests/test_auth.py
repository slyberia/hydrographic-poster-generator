from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app import auth
from app.auth import AppRole, Principal


def _test_app(dependency):
    test_app = FastAPI()

    @test_app.get("/protected", dependencies=[Depends(dependency)])
    async def protected():
        return {"ok": True}

    return test_app


def test_missing_bearer_token_is_rejected():
    with TestClient(_test_app(auth.require_analyst)) as client:
        response = client.get("/protected")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_verified_app_metadata_role_builds_principal(monkeypatch):
    monkeypatch.setattr(
        auth,
        "_decode_access_token",
        lambda token: {
            "sub": "user-1",
            "app_metadata": {"app_role": "analyst"},
        },
    )
    test_app = _test_app(auth.require_analyst)

    with TestClient(test_app) as client:
        response = client.get(
            "/protected",
            headers={"Authorization": "Bearer signed-token"},
        )

    assert response.status_code == 200


def test_user_metadata_does_not_grant_a_role(monkeypatch):
    monkeypatch.setattr(
        auth,
        "_decode_access_token",
        lambda token: {
            "sub": "user-1",
            "app_metadata": {},
            "user_metadata": {"app_role": "admin"},
        },
    )
    test_app = _test_app(auth.require_viewer)

    with TestClient(test_app) as client:
        response = client.get(
            "/protected",
            headers={"Authorization": "Bearer signed-token"},
        )

    assert response.status_code == 403


def test_viewer_cannot_use_analyst_route():
    test_app = _test_app(auth.require_analyst)
    test_app.dependency_overrides[auth.get_current_principal] = lambda: Principal(
        user_id="user-1",
        role=AppRole.VIEWER,
    )

    with TestClient(test_app) as client:
        response = client.get("/protected")

    assert response.status_code == 403


def test_analyst_can_use_analyst_route():
    test_app = _test_app(auth.require_analyst)
    test_app.dependency_overrides[auth.get_current_principal] = lambda: Principal(
        user_id="user-1",
        role=AppRole.ANALYST,
    )

    with TestClient(test_app) as client:
        response = client.get("/protected")

    assert response.status_code == 200


def test_admin_satisfies_lower_role_requirements():
    test_app = _test_app(auth.require_viewer)
    test_app.dependency_overrides[auth.get_current_principal] = lambda: Principal(
        user_id="user-1",
        role=AppRole.ADMIN,
    )

    with TestClient(test_app) as client:
        response = client.get("/protected")

    assert response.status_code == 200
