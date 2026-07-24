"""UX-9 — internal dashboard aggregate + authorization tests.

Aggregation is tested at the service layer against a fake asyncpg connection;
authorization is tested through the app with dependency overrides.
"""

import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch

os.environ.setdefault("ENABLE_DEBUG_ENDPOINTS", "0")

from fastapi.testclient import TestClient

from app import auth
from app.auth import AppRole, Principal
from app.services import drone_dashboard_service as dash


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


def make_conn(*, fetchrow=None, fetch=None):
    conn = MagicMock()
    conn.fetchrow = AsyncMock(side_effect=list(fetchrow or []))
    conn.fetch = AsyncMock(side_effect=list(fetch or []))
    return conn


def make_pool(conn):
    pool = MagicMock()
    pool.acquire = lambda: _AcquireCtx(conn)
    return pool


# --------------------------------------------------------------------------- #
#  Freshness
# --------------------------------------------------------------------------- #

def test_freshness_flags_stale_publication():
    fresh = dash._freshness("2020-01-01T00:00:00+00:00", "region-4-mvp-v1")
    assert fresh["is_stale"] is True
    assert fresh["days_since_published"] > dash.STALE_THRESHOLD_DAYS
    assert fresh["methodology_version"] == "region-4-mvp-v1"


def test_freshness_none_when_unpublished():
    fresh = dash._freshness(None, "region-4-mvp-v1")
    assert fresh["is_stale"] is False
    assert fresh["days_since_published"] is None


# --------------------------------------------------------------------------- #
#  Run history grouping
# --------------------------------------------------------------------------- #

def test_run_history_groups_zone_distribution_per_run():
    conn = make_conn(fetch=[[
        {"run_id": "r1", "label": "baseline", "lifecycle_state": "published",
         "created_at": "t2", "zone": "SUITABLE", "cells": 30},
        {"run_id": "r1", "label": "baseline", "lifecycle_state": "published",
         "created_at": "t2", "zone": "PROHIBITED", "cells": 10},
        # A completed run with no scored cells (LEFT JOIN yields NULLs).
        {"run_id": "r2", "label": "empty", "lifecycle_state": "draft",
         "created_at": "t1", "zone": None, "cells": None},
    ]])
    history = asyncio.run(dash._run_history(conn, 1))

    assert [h["run_id"] for h in history] == ["r1", "r2"]
    r1 = history[0]
    assert r1["total_cells"] == 40
    suitable = next(z for z in r1["zone_distribution"] if z["zone"] == "SUITABLE")
    assert suitable["pct"] == 75.0
    assert history[1]["total_cells"] == 0
    assert history[1]["zone_distribution"] == []


# --------------------------------------------------------------------------- #
#  Full assembly
# --------------------------------------------------------------------------- #

def test_get_dashboard_empty_when_no_study_area():
    conn = make_conn(fetchrow=[None])  # _study_area -> None
    result = asyncio.run(dash.get_dashboard(make_pool(conn)))
    assert result["study_area"] is None
    assert result["published"] is None
    assert result["run_history"] == []
    assert result["freshness"]["is_stale"] is False


def test_get_dashboard_assembles_published_metrics():
    conn = make_conn(
        fetchrow=[
            # _study_area
            {"region_id": 1, "slug": "region-4-demerara-mahaica",
             "display_name": "Region 4", "methodology_version": "region-4-mvp-v1"},
            # _published_run
            {"run_id": "pub-1", "label": "baseline", "lifecycle_state": "published",
             "published_at": "2026-07-20T00:00:00+00:00", "published_by": "admin-1",
             "created_at": "2026-07-19T00:00:00+00:00", "completed_at": "2026-07-19T00:01:00+00:00"},
            # _latest_run
            {"run_id": "pub-1", "label": "baseline", "status": "complete",
             "created_at": "2026-07-19T00:00:00+00:00", "completed_at": "2026-07-19T00:01:00+00:00"},
            # _latest_sensitivity
            {"sweep_id": "sw-1", "base_run_id": "pub-1", "base_label": "baseline",
             "avg_stddev": 0.2, "max_stddev": 0.5, "total_zone_flips": 4,
             "pct_cells_flipped": 12.5, "created_at": "2026-07-19T00:02:00+00:00",
             "factor_rankings": [{"factor_key": "population", "direction": "up",
                                  "mean_absolute_deviation": 0.21, "zone_flips": 3}]},
        ],
        fetch=[[
            {"run_id": "pub-1", "label": "baseline", "lifecycle_state": "published",
             "created_at": "2026-07-19T00:00:00+00:00", "zone": "SUITABLE", "cells": 100},
        ]],
    )
    stats = {"run_id": "pub-1", "total_cells": 150,
             "zones": [{"zone": "SUITABLE", "cells": 100, "area_km2": 60.0, "pct": 66.7},
                       {"zone": "PROHIBITED", "cells": 50, "area_km2": 30.0, "pct": 33.3}]}

    with patch("app.services.drone_service.run_stats",
               new_callable=AsyncMock, return_value=stats):
        result = asyncio.run(dash.get_dashboard(make_pool(conn)))

    assert result["published"]["run_id"] == "pub-1"
    assert result["published"]["analyzed_area_km2"] == 90.0
    assert result["published"]["total_cells"] == 150
    assert result["sensitivity"]["factor_rankings"][0]["factor_key"] == "population"
    assert result["latest_run"]["run_id"] == "pub-1"
    assert len(result["run_history"]) == 1
    # No cell geometry anywhere in the payload.
    assert "geometry" not in repr(result).lower()


# --------------------------------------------------------------------------- #
#  Authorization
# --------------------------------------------------------------------------- #

def _as_role(role: AppRole):
    return lambda: Principal(user_id="user-1", role=role)


def test_dashboard_requires_authentication():
    from app.database import get_db_pool
    from app.main import app

    app.dependency_overrides[get_db_pool] = lambda: MagicMock()
    with patch("app.main.db.connect", new_callable=AsyncMock), \
         patch("app.main.db.disconnect", new_callable=AsyncMock), \
         patch("app.services.rules_service.RulesService.load", new_callable=AsyncMock), \
         patch("app.main.RiverRepository.check_readiness", new_callable=AsyncMock) as ready:
        ready.return_value = True
        with TestClient(app) as client:
            assert client.get("/dashboard").status_code == 401

            app.dependency_overrides[auth.get_current_principal] = _as_role(AppRole.VIEWER)
            with patch("app.routers.drone.drone_dash.get_dashboard",
                       new_callable=AsyncMock, return_value={"study_area": None}):
                assert client.get("/dashboard").status_code == 200
    app.dependency_overrides.clear()
