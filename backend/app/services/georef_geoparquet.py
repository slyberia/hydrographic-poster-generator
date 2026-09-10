"""Deterministic GeoParquet encoding for reusable georeferencing artifacts."""

from __future__ import annotations

import io
import json
import struct
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq


GEOPARQUET_VERSION = "1.1.0"
GEOMETRY_COLUMN = "geometry"


def _wkb_linestring(coordinates: list[list[float]]) -> bytes:
    if len(coordinates) < 2:
        raise ValueError("LineString geometry requires at least two coordinates")
    return struct.pack("<BI", 1, 2) + struct.pack("<I", len(coordinates)) + b"".join(
        struct.pack("<dd", float(point[0]), float(point[1])) for point in coordinates
    )


def _encode_geometry(geometry: dict[str, Any]) -> bytes:
    if geometry.get("type") != "LineString":
        raise ValueError("Phase 8A currently supports LineString geometry only")
    return _wkb_linestring(geometry.get("coordinates", []))


def _decode_geometry(value: bytes) -> dict[str, Any]:
    byte_order, geometry_type = struct.unpack("<BI", value[:5])
    if byte_order != 1 or geometry_type != 2:
        raise ValueError("Unsupported WKB geometry in GeoParquet artifact")
    count = struct.unpack("<I", value[5:9])[0]
    offset = 9
    coordinates = []
    for _ in range(count):
        coordinates.append(list(struct.unpack("<dd", value[offset : offset + 16])))
        offset += 16
    return {"type": "LineString", "coordinates": coordinates}


def _geo_metadata() -> dict[str, Any]:
    return {
        "version": GEOPARQUET_VERSION,
        "primary_column": GEOMETRY_COLUMN,
        "columns": {
            GEOMETRY_COLUMN: {
                "encoding": "WKB",
                "geometry_types": ["LineString"],
                "crs": None,
            }
        },
    }


def feature_collection_to_table(collection: dict[str, Any]) -> pa.Table:
    features = sorted(
        collection.get("features", []),
        key=lambda feature: str(feature.get("properties", {}).get("hydrorivers_id", "")),
    )
    ids = []
    geometries = []
    properties = []
    for feature in features:
        props = feature.get("properties") or {}
        ids.append(str(props.get("hydrorivers_id", len(ids))))
        geometries.append(_encode_geometry(feature.get("geometry") or {}))
        properties.append(json.dumps(props, separators=(",", ":"), sort_keys=True))
    table = pa.table({"feature_id": ids, GEOMETRY_COLUMN: geometries, "properties_json": properties})
    metadata = dict(table.schema.metadata or {})
    metadata[b"geo"] = json.dumps(_geo_metadata(), separators=(",", ":"), sort_keys=True).encode()
    metadata[b"georef_schema"] = b"georef-geoparquet-v1"
    return table.replace_schema_metadata(metadata)


def write_geoparquet(collection: dict[str, Any]) -> bytes:
    sink = pa.BufferOutputStream()
    pq.write_table(
        feature_collection_to_table(collection),
        sink,
        compression="zstd",
        compression_level=9,
        data_page_version="1.0",
        use_dictionary=True,
        write_statistics=False,
        version="2.6",
    )
    return sink.getvalue().to_pybytes()


def read_geoparquet(body: bytes) -> dict[str, Any]:
    table = pq.read_table(io.BytesIO(body))
    metadata = table.schema.metadata or {}
    geo = json.loads(metadata.get(b"geo", b"{}").decode())
    if geo.get("version") != GEOPARQUET_VERSION or geo.get("primary_column") != GEOMETRY_COLUMN:
        raise ValueError("Unsupported or incomplete GeoParquet metadata")
    columns = table.to_pydict()
    features = []
    for feature_id, geometry, props in zip(columns["feature_id"], columns[GEOMETRY_COLUMN], columns["properties_json"]):
        properties = json.loads(props)
        properties.setdefault("hydrorivers_id", feature_id)
        features.append({"type": "Feature", "geometry": _decode_geometry(geometry), "properties": properties})
    return {"type": "FeatureCollection", "features": features}
