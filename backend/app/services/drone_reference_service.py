"""Public reference layers for Milestone C.

Reference geometry is deliberately separate from model-run artifacts. The
database remains authoritative and every aviation polygon is explicitly
planning/reference-only so it cannot silently alter zoning classifications.
"""

import json
from collections.abc import Mapping
from typing import Any

import asyncpg


REFERENCE_LAYER_CONFIG: list[dict[str, Any]] = [
    {"key": "airports", "display_name": "Airports", "group": "aviation", "min_zoom": 8, "label_min_zoom": 11, "default_enabled": True, "loading": "eager"},
    {"key": "runways", "display_name": "Runways", "group": "aviation", "min_zoom": 11, "label_min_zoom": 13, "default_enabled": True, "loading": "lazy"},
    {"key": "runway_safeguarding", "display_name": "Runway Safeguarding", "group": "aviation", "min_zoom": 10, "label_min_zoom": 13, "default_enabled": True, "loading": "lazy"},
    {"key": "airport_notification", "display_name": "Airport Notification Area", "group": "aviation", "min_zoom": 9, "label_min_zoom": 12, "default_enabled": False, "loading": "lazy"},
    {"key": "schools", "display_name": "Schools", "group": "infrastructure", "min_zoom": 13, "label_min_zoom": 15, "default_enabled": False, "loading": "lazy"},
    {"key": "healthcare", "display_name": "Healthcare", "group": "infrastructure", "min_zoom": 12, "label_min_zoom": 14, "default_enabled": False, "loading": "lazy"},
    {"key": "government", "display_name": "Government", "group": "infrastructure", "min_zoom": 13, "label_min_zoom": 15, "default_enabled": False, "loading": "lazy"},
    {"key": "police", "display_name": "Police", "group": "infrastructure", "min_zoom": 14, "label_min_zoom": 16, "default_enabled": False, "loading": "lazy"},
    {"key": "fire", "display_name": "Fire", "group": "infrastructure", "min_zoom": 14, "label_min_zoom": 16, "default_enabled": False, "loading": "lazy"},
]


def _json_value(value: Any) -> Any:
    """Normalise asyncpg JSON/JSONB values across local and Cloud Run drivers."""
    if isinstance(value, str):
        return json.loads(value)
    return value


def _fc(rows: list[asyncpg.Record]) -> dict[str, Any]:
    features: list[dict[str, Any]] = []
    for row in rows:
        properties = _json_value(row["properties"]) or {}
        if not isinstance(properties, Mapping):
            raise ValueError("Reference-layer properties must be a JSON object.")
        features.append({
            "type": "Feature",
            "geometry": _json_value(row["geometry"]),
            "properties": dict(properties),
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


async def get_reference_layer_config() -> dict[str, Any]:
    return {"layers": REFERENCE_LAYER_CONFIG, "version": "milestone-c-v1"}


async def get_reference_layer(pool: asyncpg.Pool, key: str) -> dict[str, Any]:
    if key not in {item["key"] for item in REFERENCE_LAYER_CONFIG}:
        raise KeyError(key)

    async with pool.acquire() as conn:
        if key == "airports":
            rows = await conn.fetch("""
                SELECT ST_AsGeoJSON(f.geom)::json AS geometry,
                       jsonb_build_object(
                         'id', f.feature_id, 'name', f.name,
                         'category', 'airport', 'icao', f.attrs->>'icao',
                         'iata', f.attrs->>'iata', 'source', COALESCE(f.attrs->>'source', l.source),
                         'confidence', COALESCE(f.attrs->>'confidence', l.confidence::text),
                         'reference_only', true
                       ) AS properties
                FROM mcda_features f JOIN mcda_layers l ON l.layer_id = f.layer_id
                WHERE l.layer_key = 'guynode_airports' AND f.subtype_key = 'aerodrome_proximity'
                  AND GeometryType(f.geom) IN ('POINT', 'MULTIPOINT')
                ORDER BY f.name
            """)
        elif key == "airport_notification":
            rows = await conn.fetch("""
                SELECT ST_AsGeoJSON(n.geometry)::json AS geometry,
                       jsonb_build_object(
                         'id', n.notification_area_id, 'name', n.airport_id,
                         'category', 'airport_notification', 'radius_m', n.radius_m,
                         'representation_type', n.representation_type,
                         'classification_effect', n.classification_effect, 'source', n.source,
                         'confidence', n.confidence::text,
                         'explanation', 'Airport notification/coordination context; not a zoning restriction.'
                       ) AS properties
                FROM aviation_notification_areas n
                WHERE n.is_active

                UNION ALL

                SELECT ST_AsGeoJSON(ST_Transform(ST_Buffer(ST_Transform(f.geom, 32621), 5000), 4326))::json AS geometry,
                       jsonb_build_object(
                         'id', f.feature_id, 'name', f.name, 'category', 'airport_notification',
                         'radius_m', 5000, 'representation_type', 'planning_reference',
                         'classification_effect', 'none', 'source', COALESCE(f.attrs->>'source', l.source),
                         'explanation', '5 km aerodrome notification/coordination context; not a zoning restriction.'
                       ) AS properties
                FROM mcda_features f JOIN mcda_layers l ON l.layer_id = f.layer_id
                WHERE NOT EXISTS (SELECT 1 FROM aviation_notification_areas WHERE is_active)
                  AND l.layer_key = 'guynode_airports' AND f.subtype_key = 'aerodrome_proximity'
                  AND GeometryType(f.geom) IN ('POINT', 'MULTIPOINT')
            """)
        elif key == "runways":
            rows = await conn.fetch("""
                SELECT ST_AsGeoJSON(centerline)::json AS geometry,
                       jsonb_build_object(
                         'id', runway_id, 'category', 'runway', 'airport_id', airport_id,
                         'airport_code', airport_code, 'runway_designation', runway_designation,
                         'length_m', length_m, 'width_m', width_m, 'heading', heading,
                         'source', source, 'source_reference', source_reference,
                         'confidence', confidence::text, 'operational_status', operational_status
                       ) AS properties
                FROM aviation_runways ORDER BY airport_code, runway_designation
            """)
        elif key == "runway_safeguarding":
            rows = await conn.fetch("""
                SELECT ST_AsGeoJSON(geometry)::json AS geometry,
                       jsonb_build_object(
                         'id', surface_id, 'category', 'runway_safeguarding', 'airport_id', airport_id,
                         'runway_id', runway_id, 'surface_type', surface_type,
                         'representation_type', representation_type, 'classification_effect', classification_effect,
                         'source_reference', rule_source_reference, 'confidence', geometry_confidence::text,
                         'explanation', 'Planning/reference geometry used to visualize aviation context.'
                       ) AS properties
                FROM aviation_safeguarding_surfaces WHERE is_active
                ORDER BY airport_id, surface_type
            """)
        else:
            subtype = {"schools": "school", "healthcare": "hospital"}.get(key)
            if subtype:
                rows = await conn.fetch("""
                    SELECT ST_AsGeoJSON(f.geom)::json AS geometry,
                           jsonb_build_object(
                             'id', f.feature_id, 'name', f.name, 'category', $1,
                             'source', COALESCE(f.attrs->>'source', l.source),
                             'confidence', COALESCE(f.attrs->>'confidence', l.confidence::text),
                             'reference_only', true
                           ) AS properties
                    FROM mcda_features f JOIN mcda_layers l ON l.layer_id = f.layer_id
                    WHERE f.subtype_key = $2 AND l.is_active
                    ORDER BY f.name
                """, key, subtype)
            else:
                rows = await conn.fetch("""
                    SELECT ST_AsGeoJSON(f.geom)::json AS geometry,
                           jsonb_build_object(
                             'id', f.feature_id, 'name', f.name, 'category', $1,
                             'source', COALESCE(f.attrs->>'source', l.source),
                             'confidence', COALESCE(f.attrs->>'confidence', l.confidence::text),
                             'reference_only', true
                           ) AS properties
                    FROM mcda_features f JOIN mcda_layers l ON l.layer_id = f.layer_id
                    WHERE lower(COALESCE(f.attrs->>'reference_category', f.attrs->>'category', '')) = $1
                      AND l.is_active
                    ORDER BY f.name
                """, key)
    return _fc(rows)
