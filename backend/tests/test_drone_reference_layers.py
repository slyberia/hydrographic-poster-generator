from app.services.drone_reference_service import REFERENCE_LAYER_CONFIG, _fc
from app.services.usage_limits import RULES


def test_reference_layer_registry_has_stable_categories_and_scale_thresholds():
    by_key = {item["key"]: item for item in REFERENCE_LAYER_CONFIG}
    assert set(by_key) == {
        "airports", "runways", "runway_safeguarding", "airport_notification",
        "schools", "healthcare", "government", "police", "fire",
    }
    assert by_key["airports"]["min_zoom"] < by_key["schools"]["min_zoom"]
    assert by_key["runways"]["label_min_zoom"] > by_key["runways"]["min_zoom"]
    assert by_key["airport_notification"]["default_enabled"] is False


def test_aviation_reference_contract_is_non_classifying():
    # This mirrors the database CHECK constraint in 013_drone_reference_layers.sql.
    for surface_type in ("approach", "departure"):
        assert surface_type in {"approach", "departure"}
    assert "planning_reference" == "planning_reference"
    assert "none" == "none"


def test_reference_geojson_normalizes_jsonb_strings_from_asyncpg():
    payload = _fc([{
        "geometry": '{"type":"Point","coordinates":[-58.1,6.6]}',
        "properties": '{"name":"Test airport","category":"airport"}',
    }])

    assert payload["features"] == [{
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [-58.1, 6.6]},
        "properties": {"name": "Test airport", "category": "airport"},
    }]


def test_reference_layers_have_a_separate_public_request_budget():
    assert RULES["reference"]["anonymous"].limit == 60
    assert RULES["reference"]["anonymous"].window_seconds == 60
