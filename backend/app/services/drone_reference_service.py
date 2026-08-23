"""Public aviation and infrastructure reference layers.

PostGIS remains authoritative. A versioned, unified GeoJSON artifact is an
optional fast read path for published/public maps; the category endpoints stay
available as a dynamic compatibility fallback for fresh or mixed deployments.
Reference geometry never changes a model result.
"""

import hashlib
import json
import logging
from collections.abc import Mapping
from datetime import datetime, timezone
from typing import Any

import asyncpg
import httpx

from app.settings import settings


logger = logging.getLogger(__name__)

REFERENCE_SCHEMA_VERSION = "reference-layers-v2"
REFERENCE_STORAGE_ROOT = "drone/reference/region-4"
REFERENCE_MANIFEST_PATH = f"{REFERENCE_STORAGE_ROOT}/manifest.json"

REFERENCE_LAYER_CONFIG: list[dict[str, Any]] = [
    {"key": "airports", "display_name": "Airports", "group": "aviation", "min_zoom": 8, "label_min_zoom": 11, "default_enabled": True, "loading": "eager"},
    {"key": "runways", "display_name": "Runways", "group": "aviation", "min_zoom": 11, "label_min_zoom": 13, "default_enabled": False, "loading": "lazy", "available": False, "availability_note": "Coming soon — verified runway geometry has not yet been added."},
    {"key": "runway_safeguarding", "display_name": "Runway Safeguarding", "group": "aviation", "min_zoom": 10, "label_min_zoom": 13, "default_enabled": False, "loading": "lazy", "available": False, "availability_note": "Coming soon — verified safeguarding geometry has not yet been added."},
    {"key": "airport_notification", "display_name": "Airport Notification Area", "group": "aviation", "min_zoom": 9, "label_min_zoom": 12, "default_enabled": False, "loading": "lazy"},
    {"key": "schools", "display_name": "Schools", "group": "infrastructure", "min_zoom": 13, "label_min_zoom": 15, "default_enabled": False, "loading": "lazy"},
    {"key": "healthcare", "display_name": "Healthcare", "group": "infrastructure", "min_zoom": 12, "label_min_zoom": 14, "default_enabled": False, "loading": "lazy"},
    {"key": "government", "display_name": "Government", "group": "infrastructure", "min_zoom": 13, "label_min_zoom": 15, "default_enabled": False, "loading": "lazy"},
    {"key": "police", "display_name": "Police", "group": "infrastructure", "min_zoom": 14, "label_min_zoom": 16, "default_enabled": False, "loading": "lazy"},
    {"key": "fire", "display_name": "Fire", "group": "infrastructure", "min_zoom": 14, "label_min_zoom": 16, "default_enabled": False, "loading": "lazy"},
]


def _storage_public_url(path: str) -> str:
    return (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/"
        f"{settings.published_artifacts_bucket}/{path}"
    )


def _json_value(value: Any) -> Any:
    """Normalise asyncpg JSON/JSONB values across local and Cloud Run drivers."""
    if isinstance(value, str):
        return json.loads(value)
    return value


def _fc(
    rows: list[asyncpg.Record],
    *,
    layer_key: str | None = None,
    layer_group: str | None = None,
) -> dict[str, Any]:
    features: list[dict[str, Any]] = []
    for row in rows:
        properties = _json_value(row["properties"]) or {}
        if not isinstance(properties, Mapping):
            raise ValueError("Reference-layer properties must be a JSON object.")
        normalized = dict(properties)
        if layer_key:
            normalized["reference_layer_key"] = layer_key
        if layer_group:
            normalized["reference_group"] = layer_group
        features.append({
            "type": "Feature",
            "geometry": _json_value(row["geometry"]),
            "properties": normalized,
        })

    return {"type": "FeatureCollection", "features": features}


def _definition(key: str) -> dict[str, Any]:
    try:
        return next(item for item in REFERENCE_LAYER_CONFIG if item["key"] == key)
    except StopIteration as exc:
        raise KeyError(key) from exc


async def get_reference_layer_config() -> dict[str, Any]:
    payload: dict[str, Any] = {
        "layers": REFERENCE_LAYER_CONFIG,
        "version": REFERENCE_SCHEMA_VERSION,
    }
    if settings.supabase_url:
        payload["manifest_url"] = _storage_public_url(REFERENCE_MANIFEST_PATH)
    return payload


async def _rows_for_reference_layer(conn: asyncpg.Connection, key: str) -> list[asyncpg.Record]:
    if key == "airports":
        return await conn.fetch("""
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
    if key == "airport_notification":
        return await conn.fetch("""
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
    if key == "runways":
        return await conn.fetch("""
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
    if key == "runway_safeguarding":
        return await conn.fetch("""
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

    subtype = {
        "schools": "school",
        "healthcare": "hospital",
        "government": "government_facility",
        "police": "police",
        "fire": "fire_station",
    }.get(key)
    if subtype:
        return await conn.fetch("""
            SELECT ST_AsGeoJSON(f.geom)::json AS geometry,
                   jsonb_build_object(
                     'id', f.feature_id, 'name', f.name, 'category', $1::text,
                     'source', COALESCE(f.attrs->>'source', l.source),
                     'confidence', COALESCE(f.attrs->>'confidence', l.confidence::text),
                     'reference_only', true
                   ) AS properties
            FROM mcda_features f JOIN mcda_layers l ON l.layer_id = f.layer_id
            WHERE f.subtype_key = $2::text AND l.is_active
            ORDER BY f.name
        """, key, subtype)
    raise KeyError(key)


async def get_reference_layer(pool: asyncpg.Pool, key: str) -> dict[str, Any]:
    definition = _definition(key)
    async with pool.acquire() as conn:
        rows = await _rows_for_reference_layer(conn, key)
    return _fc(rows, layer_key=key, layer_group=definition["group"])


async def materialize_reference_layers(pool: asyncpg.Pool) -> dict[str, Any] | None:
    """Materialize one immutable reference dataset plus a stable manifest.

    The artifact is content-addressed so browsers can cache it indefinitely.
    The stable manifest is the only mutable pointer. Missing Storage credentials
    are non-fatal because callers retain the dynamic per-category API path.
    """
    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.info("Reference artifact storage is not configured; using dynamic API fallback.")
        return None

    all_features: list[dict[str, Any]] = []
    counts: dict[str, int] = {}
    async with pool.acquire() as conn:
        for definition in REFERENCE_LAYER_CONFIG:
            key = definition["key"]
            if definition.get("available") is False:
                counts[key] = 0
                continue
            collection = _fc(
                await _rows_for_reference_layer(conn, key),
                layer_key=key,
                layer_group=definition["group"],
            )
            counts[key] = len(collection["features"])
            all_features.extend(collection["features"])

    collection = {
        "type": "FeatureCollection",
        "metadata": {"schema_version": REFERENCE_SCHEMA_VERSION, "reference_only": True},
        "features": all_features,
    }
    artifact_body = json.dumps(collection, separators=(",", ":"), sort_keys=True).encode("utf-8")
    sha256 = hashlib.sha256(artifact_body).hexdigest()
    artifact_path = f"{REFERENCE_STORAGE_ROOT}/{sha256}/references.geojson"
    artifact_url = _storage_public_url(artifact_path)
    manifest = {
        "schema_version": 1,
        "dataset_version": sha256,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "reference_only": True,
        "artifact": {
            "url": artifact_url,
            "storage_path": artifact_path,
            "sha256": sha256,
            "byte_size": len(artifact_body),
            "feature_count": len(all_features),
        },
        "layers": [
            {
                "key": definition["key"],
                "group": definition["group"],
                "available": definition.get("available", True),
                "feature_count": counts[definition["key"]],
            }
            for definition in REFERENCE_LAYER_CONFIG
        ],
    }
    manifest_body = json.dumps(manifest, separators=(",", ":"), sort_keys=True).encode("utf-8")
    base_headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
        "x-upsert": "true",
    }
    storage_base = (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
        f"{settings.published_artifacts_bucket}"
    )
    async with httpx.AsyncClient(timeout=60) as client:
        artifact_response = await client.put(
            f"{storage_base}/{artifact_path}",
            content=artifact_body,
            headers={**base_headers, "Content-Type": "application/geo+json", "cache-control": "max-age=31536000"},
        )
        artifact_response.raise_for_status()
        manifest_response = await client.put(
            f"{storage_base}/{REFERENCE_MANIFEST_PATH}",
            content=manifest_body,
            headers={**base_headers, "Content-Type": "application/json", "cache-control": "max-age=60"},
        )
        manifest_response.raise_for_status()
    return manifest
