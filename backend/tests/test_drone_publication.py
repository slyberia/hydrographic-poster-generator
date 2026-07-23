"""ARC-1 — publication lifecycle, public-safety, and authorization tests.

Transition semantics are tested at the service layer against a fake asyncpg
connection (deterministic call sequences), so no live database is required.
Authorization is tested through the app with dependency overrides, matching the
style of tests/test_auth.py and tests/test_routers.py.
"""

import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault("ENABLE_DEBUG_ENDPOINTS", "0")

from fastapi.testclient import TestClient

from app import auth
from app.auth import AppRole, Principal
from app.services import drone_publication_service as pub


# --------------------------------------------------------------------------- #
#  Fake asyncpg plumbing
# --------------------------------------------------------------------------- #

class _AcquireCtx:
    def __init__(self, conn):
        self._conn = conn

    async def __aenter__(self):
        return self._conn

    async def __aexit__(self, *exc):
        return False


class _TxnCtx:
    async def __aenter__(self):
        return None

    async def __aexit__(self, *exc):
        return False


def make_conn(*, fetchrow=None, fetchval=None):
    conn = MagicMock()
    conn.transaction = lambda: _TxnCtx()
    conn.fetchrow = AsyncMock(side_effect=list(fetchrow or []))
    conn.fetchval = AsyncMock(side_effect=list(fetchval or []))
    conn.fetch = AsyncMock(return_value=[])
    conn.execute = AsyncMock(return_value="UPDATE 1")
    return conn


def make_pool(conn):
    pool = MagicMock()
    pool.acquire = lambda: _AcquireCtx(conn)
    return pool


def returning_row(**overrides):
    row = {
        "run_id": "run-x",
        "lifecycle_state": "draft",
        "status": "complete",
        "approved_at": None,
        "published_at": None,
        "archived_at": None,
        "supersedes_run_id": None,
    }
    row.update(overrides)
    return row


# --------------------------------------------------------------------------- #
#  approve_run
# --------------------------------------------------------------------------- #

def test_approve_moves_complete_draft_to_approved():
    conn = make_conn(fetchrow=[
        {"lifecycle_state": "draft", "status": "complete"},
        returning_row(lifecycle_state="approved", approved_at="2026-07-23T00:00:00Z"),
    ])
    result = asyncio.run(pub.approve_run(make_pool(conn), "run-x", "admin-1"))

    assert result["lifecycle_state"] == "approved"
    # The UPDATE actually ran and recorded the actor.
    update_sql, run_arg, actor_arg = conn.fetchrow.call_args_list[1].args
    assert "lifecycle_state = 'approved'" in update_sql
    assert (run_arg, actor_arg) == ("run-x", "admin-1")


def test_approve_rejects_incomplete_run():
    conn = make_conn(fetchrow=[{"lifecycle_state": "draft", "status": "running"}])
    with pytest.raises(pub.LifecycleError):
        asyncio.run(pub.approve_run(make_pool(conn), "run-x", "admin-1"))
    # No UPDATE issued.
    assert conn.fetchrow.await_count == 1


def test_approve_rejects_non_draft():
    conn = make_conn(fetchrow=[{"lifecycle_state": "approved", "status": "complete"}])
    with pytest.raises(pub.LifecycleError):
        asyncio.run(pub.approve_run(make_pool(conn), "run-x", "admin-1"))


def test_approve_unknown_run_is_not_found():
    conn = make_conn(fetchrow=[None])
    with pytest.raises(pub.NotFoundError):
        asyncio.run(pub.approve_run(make_pool(conn), "missing", "admin-1"))


# --------------------------------------------------------------------------- #
#  publish_run
# --------------------------------------------------------------------------- #

def test_publish_supersedes_incumbent_transactionally():
    conn = make_conn(
        fetchrow=[
            {"region_id": 1, "lifecycle_state": "approved", "status": "complete"},
            returning_row(
                run_id="new", lifecycle_state="published",
                published_at="2026-07-23T00:00:00Z", supersedes_run_id="old",
            ),
        ],
        fetchval=["old"],  # incumbent published run
    )
    result = asyncio.run(pub.publish_run(make_pool(conn), "new", "admin-1"))

    assert result["lifecycle_state"] == "published"
    assert result["supersedes_run_id"] == "old"
    # Incumbent archived before the new run is published.
    archive_sql, old_arg, actor_arg = conn.execute.call_args.args
    assert "lifecycle_state = 'archived'" in archive_sql
    assert (old_arg, actor_arg) == ("old", "admin-1")
    # New run published with supersedes set to the archived run.
    publish_args = conn.fetchrow.call_args_list[1].args
    assert publish_args[1:] == ("new", "admin-1", "old")


def test_publish_with_no_incumbent_archives_nothing():
    conn = make_conn(
        fetchrow=[
            {"region_id": 1, "lifecycle_state": "approved", "status": "complete"},
            returning_row(run_id="new", lifecycle_state="published"),
        ],
        fetchval=[None],
    )
    asyncio.run(pub.publish_run(make_pool(conn), "new", "admin-1"))
    conn.execute.assert_not_called()


def test_publish_rejects_unapproved_run():
    conn = make_conn(fetchrow=[{"region_id": 1, "lifecycle_state": "draft", "status": "complete"}])
    with pytest.raises(pub.LifecycleError):
        asyncio.run(pub.publish_run(make_pool(conn), "run-x", "admin-1"))
    conn.fetchval.assert_not_called()


# --------------------------------------------------------------------------- #
#  archive_run
# --------------------------------------------------------------------------- #

def test_archive_from_published():
    conn = make_conn(fetchrow=[
        {"lifecycle_state": "published"},
        returning_row(lifecycle_state="archived", archived_at="2026-07-23T00:00:00Z"),
    ])
    result = asyncio.run(pub.archive_run(make_pool(conn), "run-x", "admin-1"))
    assert result["lifecycle_state"] == "archived"


def test_archive_already_archived_rejected():
    conn = make_conn(fetchrow=[{"lifecycle_state": "archived"}])
    with pytest.raises(pub.LifecycleError):
        asyncio.run(pub.archive_run(make_pool(conn), "run-x", "admin-1"))


# --------------------------------------------------------------------------- #
#  Public-safe projections
# --------------------------------------------------------------------------- #

_CONFIG_ROW = {
    "region_id": 1,
    "slug": "region-4-demerara-mahaica",
    "display_name": "Region 4 · Demerara-Mahaica",
    "center_lat": 6.6,
    "center_lng": -58.1,
    "default_zoom": 10,
    "min_zoom": 1,
    "max_zoom": 18,
    "bbox_west": -58.9,
    "bbox_south": 6.0,
    "bbox_east": -57.3,
    "bbox_north": 7.3,
    "h3_resolution": 9,
    "methodology_version": "region-4-mvp-v1",
}


def test_public_config_reports_published_metadata():
    conn = make_conn(fetchrow=[_CONFIG_ROW, {"published_at": "2026-07-23T00:00:00Z"}])
    payload = asyncio.run(pub.get_public_config(make_pool(conn)))

    assert payload["study_area"]["slug"] == "region-4-demerara-mahaica"
    assert payload["study_area"]["center"] == {"lat": 6.6, "lng": -58.1}
    assert payload["study_area"]["bbox"]["west"] == -58.9
    assert payload["published"]["published_at"] == "2026-07-23T00:00:00Z"
    # No editable weights leak into the public config.
    assert "weight" not in repr(payload).lower()


def test_public_config_with_nothing_published():
    conn = make_conn(fetchrow=[_CONFIG_ROW, None])
    payload = asyncio.run(pub.get_public_config(make_pool(conn)))
    assert payload["published"] is None


def test_public_report_excludes_scores_and_weights():
    conn = make_conn(
        fetchrow=[
            _CONFIG_ROW,  # _published_run_id -> _default_config_row
            _CONFIG_ROW,  # public_location_report -> _default_config_row
            {
                "zone": "RESTRICTED",
                "dominant_reason": "Within 300 m of hospital",
                "constraint_reasons": ["Within 5000 m of airport"],
                "confidence": "verified",
            },
        ],
        fetchval=["run-1"],  # published run id
    )
    report = asyncio.run(pub.public_location_report(make_pool(conn), "8abc"))

    assert report["zone"] == "RESTRICTED"
    assert report["classification"] == "Restricted"
    assert report["guidance"]
    assert report["disclaimer"]
    # The internal numeric score and the weight-bearing factor breakdown are gone.
    assert "risk_score" not in report
    assert "score" not in report
    assert "factor_breakdown" not in report
    assert "weight" not in repr(report).lower()


def test_public_zoning_without_publication_is_not_found():
    conn = make_conn(fetchrow=[_CONFIG_ROW], fetchval=[None])  # no published run
    with pytest.raises(pub.NotFoundError):
        asyncio.run(pub.public_zoning_geojson(make_pool(conn)))


# --------------------------------------------------------------------------- #
#  Authorization wiring (through the app)
# --------------------------------------------------------------------------- #

@pytest.fixture
def app_client():
    from app.database import get_db_pool
    from app.main import app

    app.dependency_overrides[get_db_pool] = lambda: MagicMock()

    with patch("app.main.db.connect", new_callable=AsyncMock), \
         patch("app.main.db.disconnect", new_callable=AsyncMock), \
         patch("app.services.rules_service.RulesService.load", new_callable=AsyncMock), \
         patch("app.main.RiverRepository.check_readiness", new_callable=AsyncMock) as ready:
        ready.return_value = True
        with TestClient(app) as client:
            yield client

    app.dependency_overrides.clear()


def _as_role(role: AppRole):
    return lambda: Principal(user_id="user-1", role=role)


def test_internal_run_list_requires_authentication(app_client):
    # No bearer token → 401 before any DB access.
    assert app_client.get("/runs").status_code == 401


def test_publish_requires_admin_role(app_client):
    from app.main import app

    app.dependency_overrides[auth.get_current_principal] = _as_role(AppRole.VIEWER)
    assert app_client.post("/runs/run-x/publish").status_code == 403


def test_publish_allowed_for_admin(app_client):
    from app.main import app

    app.dependency_overrides[auth.get_current_principal] = _as_role(AppRole.ADMIN)
    with patch(
        "app.routers.drone.drone_pub.publish_run",
        new_callable=AsyncMock,
    ) as publish:
        publish.return_value = {"run_id": "run-x", "lifecycle_state": "published"}
        response = app_client.post("/runs/run-x/publish")
    assert response.status_code == 200
    assert response.json()["lifecycle_state"] == "published"


def test_public_config_is_open(app_client):
    with patch(
        "app.routers.public_drone.pub.get_public_config",
        new_callable=AsyncMock,
    ) as cfg:
        cfg.return_value = {"study_area": {"slug": "s"}, "published": None}
        response = app_client.get("/public/drone/config")
    assert response.status_code == 200
    assert response.json()["study_area"]["slug"] == "s"
