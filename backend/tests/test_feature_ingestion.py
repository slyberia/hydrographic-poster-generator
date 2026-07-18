import pytest
from pathlib import Path
from scripts.ingest_drone_data import (
    match_osm_element,
    osm_element_to_geojson,
    build_overpass_query,
    MANUAL_FEATURES,
    parse_osm_pbf_file,
    normalize_tags,
)


def test_match_osm_element_school():
    """Verify match_osm_element matches tags correctly for a school."""
    elem = {
        "type": "node",
        "id": 12345,
        "tags": {
            "amenity": "school",
            "name": "Timehri Primary School"
        }
    }
    matches = match_osm_element(elem)
    assert len(matches) == 1
    key, config = matches[0]
    assert key == "school"
    assert config["layer_key"] == "guynode_schools_r4"


def test_match_osm_element_no_match():
    """Verify match_osm_element returns empty list for unrelated tags."""
    elem = {
        "type": "node",
        "id": 12345,
        "tags": {
            "highway": "residential"
        }
    }
    matches = match_osm_element(elem)
    assert len(matches) == 0


def test_normalize_tags():
    """Verify normalize_tags handles tags/tag keys and non-dict inputs correctly."""
    assert normalize_tags({"tags": {"amenity": "school"}}) == {"amenity": "school"}
    assert normalize_tags({"tag": {"power": "line"}}) == {"power": "line"}
    assert normalize_tags({"tags": None}) == {}
    assert normalize_tags({"type": "node"}) == {}


def test_match_osm_element_disjunctive():
    """Verify disjunctive rule engine matches ports and pier correctly."""
    # Test harbour=yes matches port
    elem1 = {"type": "node", "id": 1, "tags": {"harbour": "yes"}}
    matches1 = match_osm_element(elem1)
    assert len(matches1) == 1
    assert matches1[0][0] == "port"
    
    # Test landuse=industrial AND industrial=port matches port
    elem2 = {"type": "node", "id": 2, "tags": {"landuse": "industrial", "industrial": "port"}}
    matches2 = match_osm_element(elem2)
    assert len(matches2) == 1
    assert matches2[0][0] == "port"

    # Test landuse=industrial alone does NOT match port
    elem3 = {"type": "node", "id": 3, "tags": {"landuse": "industrial"}}
    matches3 = match_osm_element(elem3)
    assert len(matches3) == 0

    # Test man_made=pier matches pier
    elem4 = {"type": "way", "id": 4, "tags": {"man_made": "pier"}}
    matches4 = match_osm_element(elem4)
    assert len(matches4) == 1
    assert matches4[0][0] == "pier"



def test_osm_element_to_geojson_point():
    """Verify osm_element_to_geojson converts a node into a Point geometry."""
    elem = {
        "type": "node",
        "lon": -58.2,
        "lat": 6.8
    }
    config = {"allowed_geometry_types": {"Point"}}
    geom = osm_element_to_geojson(elem, config)
    assert geom["type"] == "Point"
    assert geom["coordinates"] == [-58.2, 6.8]


def test_osm_element_to_geojson_polygon():
    """Verify osm_element_to_geojson converts a closed way into a Polygon geometry if expected."""
    elem = {
        "type": "way",
        "geometry": [
            {"lon": -58.2, "lat": 6.7},
            {"lon": -58.1, "lat": 6.7},
            {"lon": -58.1, "lat": 6.8},
            {"lon": -58.2, "lat": 6.8},
            {"lon": -58.2, "lat": 6.7}
        ]
    }
    config = {"allowed_geometry_types": {"Polygon"}}
    geom = osm_element_to_geojson(elem, config)
    assert geom["type"] == "Polygon"
    assert len(geom["coordinates"][0]) == 5


def test_build_overpass_query():
    """Verify build_overpass_query correctly builds the query string with bbox."""
    bbox = (6.4, -58.3, 6.9, -58.0)
    query = build_overpass_query(bbox)
    assert "6.4,-58.3,6.9,-58.0" in query
    assert "amenity" in query
    assert "power" in query


def test_manual_features_structure():
    """Verify manually seeded features have correct schema tags and coordinates."""
    for feature in MANUAL_FEATURES:
        assert feature["source_key"].startswith("manual:")
        assert feature["confidence"] in ("verified_authoritative", "manually_seeded")
        assert feature["geom"]["type"] == "Point"
        assert len(feature["geom"]["coordinates"]) == 2


def test_parse_osm_pbf_file(monkeypatch):
    """Verify parse_osm_pbf_file parses sequential nodes and ways correctly."""
    mock_data = [
        # Node (matching school)
        {
            "type": "node",
            "id": 1,
            "lat": 6.8,
            "lon": -58.1,
            "tag": {"amenity": "school", "name": "Test School"}
        },
        # Node (not matching, but part of a way)
        {
            "type": "node",
            "id": 10,
            "lat": 6.81,
            "lon": -58.11,
            "tag": {}
        },
        {
            "type": "node",
            "id": 11,
            "lat": 6.82,
            "lon": -58.12,
            "tag": {}
        },
        # Way (matching power line)
        {
            "type": "way",
            "id": 100,
            "nd": [10, 11],
            "tag": {"power": "line"}
        }
    ]

    monkeypatch.setattr("osmiter.iter_from_osm", lambda path: iter(mock_data))
    
    bbox = (6.0, -59.0, 7.0, -57.0)
    features, pbf_diag = parse_osm_pbf_file(Path("dummy.pbf"), bbox)
    
    assert len(features) == 2
    assert pbf_diag["candidate_nodes_matched"] == 1
    assert pbf_diag["candidate_ways_matched"] == 1
    assert pbf_diag["ways_resolved"] == 1
    assert pbf_diag["ways_dropped_unresolved_nodes"] == 0
    
    # Check first matched feature (school node)
    f0 = features[0]
    assert f0["type"] == "node"
    assert f0["id"] == 1
    assert f0["geometry"]["type"] == "Point"
    assert f0["geometry"]["coordinates"] == [-58.1, 6.8]
    
    # Check second matched feature (power line way)
    f1 = features[1]
    assert f1["type"] == "way"
    assert f1["id"] == 100
    assert f1["geometry"]["type"] == "LineString"
    assert f1["geometry"]["coordinates"] == [[-58.11, 6.81], [-58.12, 6.82]]

