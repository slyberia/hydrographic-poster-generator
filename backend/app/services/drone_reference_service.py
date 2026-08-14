"""Public reference layers for Milestone C.

Reference geometry is deliberately separate from model-run artifacts. The
database remains authoritative and every aviation polygon is explicitly
planning/reference-only so it cannot silently alter zoning classifications.
"""

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


def _fc(rows: list[asyncpg.Record]) -> dict[str, Any]:
    def geometry(value: Any) -> Any:
        if isinstance(value, str):
            import json
            return json.loads(value)
        return value

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": geometry(row["geometry"]),
                "properties": dict(row["properties"] or {}),
            }
            for row in rows
        ],
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
                SELECT ST_AsGeoJSON(ST_Transform(ST_Buffer(ST_Transform(f.geom, 32621), 5000), 4326))::json AS geometry,
                       jsonb_build_object(
                         'id', f.feature_id, 'name', f.name, 'category', 'airport_notification',
                         'radius_m', 5000, 'representation_type', 'planning_reference',
                         'classification_effect', 'none', 'source', COALESCE(f.attrs->>'source', l.source),
                         'explanation', '5 km aerodrome notification/coordination context; not a zoning restriction.'
                       ) AS properties
                FROM mcda_features f JOIN mcda_layers l ON l.layer_id = f.layer_id
                WHERE l.layer_key = 'guynode_airports' AND f.subtype_key = 'aerodrome_proximity'
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
