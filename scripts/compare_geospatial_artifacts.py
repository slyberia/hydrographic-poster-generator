"""Compare deterministic GeoJSON and GeoParquet packaging metrics."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.services.georef_geoparquet import read_geoparquet, write_geoparquet


def _tile_point(point: list[float]) -> list[float]:
    lon, lat = point
    lat = max(-85.05112878, min(85.05112878, lat))
    x = (lon + 180.0) / 360.0 * 4096.0
    y = (1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * 4096.0
    return [x, y]


def _mvt_body(collection: dict) -> bytes:
    import mapbox_vector_tile

    features = []
    for feature in collection.get("features", []):
        geometry = feature["geometry"]
        features.append({
            "geometry": {"type": "LineString", "coordinates": [_tile_point(p) for p in geometry["coordinates"]]},
            "properties": feature.get("properties", {}),
        })
    return mapbox_vector_tile.encode({"name": "rivers", "features": features}, extents=4096)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    collection = json.loads(args.input.read_text(encoding="utf-8"))
    parquet = write_geoparquet(collection)
    round_trip = read_geoparquet(parquet)
    work_dir = args.output.parent / "format-bakeoff"
    work_dir.mkdir(parents=True, exist_ok=True)
    fgb_path = work_dir / "artifact.fgb"
    import geopandas as gpd
    from shapely.geometry import shape
    gdf = gpd.GeoDataFrame(
        [{**(feature.get("properties") or {}), "geometry": shape(feature["geometry"])} for feature in collection.get("features", [])],
        geometry="geometry",
        crs="EPSG:4326",
    )
    gdf.to_file(fgb_path, driver="FlatGeobuf", index=False)
    mvt = _mvt_body(collection)
    mvt_path = work_dir / "z0-x0-y0.mvt"
    mvt_path.write_bytes(mvt)
    result = {
        "input": str(args.input),
        "geojson_bytes": args.input.stat().st_size,
        "geoparquet_bytes": len(parquet),
        "compression_ratio": round(len(parquet) / args.input.stat().st_size, 6),
        "feature_count": len(round_trip["features"]),
        "flatgeobuf": {"status": "measured_analysis_only", "bytes": fgb_path.stat().st_size, "feature_count": len(gpd.read_file(fgb_path))},
        "pmtiles_mvt": {"status": "measured_analysis_only", "bytes": len(mvt), "tile": "z0-x0-y0", "feature_count": len(collection.get("features", []))},
        "decision": "GeoParquet is the canonical reusable artifact; browser tiled formats remain derived delivery candidates.",
    }
    args.output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
