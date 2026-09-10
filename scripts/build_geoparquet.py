"""Build a deterministic GeoParquet artifact from a GeoJSON FeatureCollection."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.services.georef_geoparquet import GEOPARQUET_VERSION, write_geoparquet


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--country", required=True)
    parser.add_argument("--country-code", required=True)
    parser.add_argument("--geography-id", required=True)
    parser.add_argument("--source-version", required=True)
    args = parser.parse_args()
    collection = json.loads(args.input.read_text(encoding="utf-8"))
    body = write_geoparquet(collection)
    digest = hashlib.sha256(body).hexdigest()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(body)
    manifest = {
        "schema_version": "georef-geoparquet-v1",
        "format": "GeoParquet",
        "geoparquet_version": GEOPARQUET_VERSION,
        "country": args.country,
        "country_code": args.country_code,
        "geography_id": args.geography_id,
        "source_version": args.source_version,
        "feature_count": len(collection.get("features", [])),
        "sha256": digest,
        "byte_size": len(body),
        "artifact_path": args.output.name,
        "geometry_encoding": "WKB",
        "crs": "EPSG:4326",
        "provenance": {"input": str(args.input), "raw_geometry_in_repository": False},
    }
    manifest_path = args.output.with_name("manifest.json")
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(manifest, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
