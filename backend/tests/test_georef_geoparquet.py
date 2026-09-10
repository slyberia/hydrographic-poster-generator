import hashlib
import json

from app.services.georef_geoparquet import (
    GEOPARQUET_VERSION,
    feature_collection_to_table,
    read_geoparquet,
    write_geoparquet,
)


COLLECTION = {
    "type": "FeatureCollection",
    "features": [
        {"type": "Feature", "geometry": {"type": "LineString", "coordinates": [[-58.1, 6.2], [-58.0, 6.3]]}, "properties": {"hydrorivers_id": 2, "display_class": "minor"}},
        {"type": "Feature", "geometry": {"type": "LineString", "coordinates": [[-58.4, 6.0], [-58.2, 6.1]]}, "properties": {"hydrorivers_id": 1, "display_class": "major"}},
    ],
}


def test_geoparquet_metadata_declares_wkb_and_schema():
    metadata = feature_collection_to_table(COLLECTION).schema.metadata
    geo = json.loads(metadata[b"geo"])
    assert geo["version"] == GEOPARQUET_VERSION
    assert geo["primary_column"] == "geometry"
    assert geo["columns"]["geometry"]["encoding"] == "WKB"


def test_geoparquet_is_deterministic_and_round_trips_features():
    first = write_geoparquet(COLLECTION)
    second = write_geoparquet({"features": list(reversed(COLLECTION["features"]))})
    assert first == second
    assert hashlib.sha256(first).hexdigest() == hashlib.sha256(second).hexdigest()
    decoded = read_geoparquet(first)
    assert [feature["properties"]["hydrorivers_id"] for feature in decoded["features"]] == [1, 2]
    assert decoded["features"][0]["geometry"]["coordinates"] == [[-58.4, 6.0], [-58.2, 6.1]]
