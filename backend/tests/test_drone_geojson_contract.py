"""GeoJSON export contract tests (no database or GIS runtime required)."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services import drone_service


class _Acquire:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, *exc):
        return False


def _pool_with_rows(rows):
    conn = MagicMock()
    conn.fetch = AsyncMock(return_value=rows)
    pool = MagicMock()
    pool.acquire = lambda: _Acquire(conn)
    return pool, conn


def test_cell_export_makes_null_score_semantics_explicit():
    pool, _ = _pool_with_rows([{
        "h3_index": "8928308280fffff",
        "zone": "SUITABLE",
        "total_score": None,
        "constraint_reasons": [],
        "dominant_reason": "No mapped risk factors",
        "confidence": None,
        "classification_method": "default_no_mapped_factors",
        "score_applicability": "not_applicable",
        "geometry": '{"type":"Polygon","coordinates":[]}',
    }])

    payload = asyncio.run(drone_service.results_geojson(pool, "run-1"))

    assert payload["export_geometry_mode"] == "cell"
    properties = payload["features"][0]["properties"]
    assert properties["score"] is None
    assert properties["score_applicability"] == "not_applicable"
    assert properties["classification_method"] == "default_no_mapped_factors"
    assert properties["triggering_constraints"] == []
    assert properties["h3_index"] == "8928308280fffff"


def test_legacy_published_rows_use_derived_semantics_at_read_time():
    pool, conn = _pool_with_rows([{
        "h3_index": "8928308280fffff",
        "zone": "PROHIBITED",
        "total_score": None,
        "constraint_reasons": ["Within 5000 m of airport"],
        "dominant_reason": "Within 5000 m of airport",
        "confidence": "verified",
        # Published rows are intentionally left unmodified by migration 012.
        "classification_method": None,
        "score_applicability": None,
        "geometry": '{"type":"Polygon","coordinates":[]}',
    }])

    asyncio.run(drone_service.results_geojson(pool, "published-run"))

    query = conn.fetch.call_args.args[0]
    assert "COALESCE(" in query
    assert "r.classification_method" in query
    assert "r.score_applicability" in query
    assert "hard_constraint" in query
    assert "context_only" in query


def test_dissolved_export_omits_per_cell_attributes_and_uses_union_query():
    pool, conn = _pool_with_rows([{
        "zone": "PROHIBITED",
        "cell_count": 12,
        "area_km2": 1.25,
        "classification_methods": ["hard_constraint", "weighted_mcda"],
        "geometry": '{"type":"MultiPolygon","coordinates":[]}',
    }])

    payload = asyncio.run(
        drone_service.results_geojson(pool, "run-1", geometry_mode="dissolved")
    )

    query = conn.fetch.call_args.args[0]
    assert "ST_UnaryUnion" in query
    properties = payload["features"][0]["properties"]
    assert properties["zone"] == "PROHIBITED"
    assert properties["cell_count"] == 12
    assert "h3_index" not in properties
    assert "score" not in properties
    assert properties["score_applicability"] == "not_applicable"


def test_unknown_geometry_mode_is_rejected_before_database_access():
    pool, conn = _pool_with_rows([])

    with pytest.raises(ValueError, match="geometry_mode"):
        asyncio.run(drone_service.results_geojson(pool, "run-1", geometry_mode="bad"))

    conn.fetch.assert_not_called()


def test_run_write_contract_labels_hard_constraints_and_scores():
    """The execution SQL records whether a score selected the zone or is context."""
    source = drone_service.execute_run.__code__.co_consts
    sql = "\n".join(value for value in source if isinstance(value, str))
    assert "classification_method" in sql
    assert "score_applicability" in sql
    assert "context_only" in sql
