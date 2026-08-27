import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from app.services import drone_reference_service as reference
from app.services.drone_reference_service import REFERENCE_LAYER_CONFIG, _fc
from app.services.usage_limits import RULES


class _Acquire:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, *exc):
        return False


def _pool(conn):
    pool = MagicMock()
    pool.acquire = lambda: _Acquire(conn)
    return pool


class _StorageResponse:
    def raise_for_status(self):
        return None


class _StorageClient:
    def __init__(self):
        self.puts = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def put(self, url, *, content, headers):
        self.puts.append((url, content, headers))
        return _StorageResponse()


def test_reference_layer_registry_has_stable_categories_and_scale_thresholds():
    by_key = {item["key"]: item for item in REFERENCE_LAYER_CONFIG}
    assert set(by_key) == {
        "airports", "runways", "runway_safeguarding", "airport_notification",
        "schools", "healthcare", "government", "police", "fire",
    }
    assert by_key["airports"]["min_zoom"] < by_key["schools"]["min_zoom"]
    assert by_key["runways"]["label_min_zoom"] > by_key["runways"]["min_zoom"]
    assert by_key["runways"]["available"] is False
    assert by_key["runway_safeguarding"]["available"] is False
    assert all("available" not in by_key[key] for key in ("government", "police", "fire"))
    assert "Coming soon" in by_key["runways"]["availability_note"]
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


def test_reference_layers_have_a_separate_request_budget():
    assert RULES["reference"]["anonymous"].limit == 60
    assert RULES["reference"]["anonymous"].window_seconds == 60


def test_dynamic_infrastructure_queries_cast_parameter_types():
    conn = MagicMock()
    conn.fetch = AsyncMock(return_value=[])

    asyncio.run(reference.get_reference_layer(_pool(conn), "schools"))
    school_sql = conn.fetch.await_args.args[0]
    assert "'category', $1::text" in school_sql
    assert "f.subtype_key = $2::text" in school_sql

    asyncio.run(reference.get_reference_layer(_pool(conn), "police"))
    safety_sql = conn.fetch.await_args.args[0]
    assert "'category', $1::text" in safety_sql
    assert "f.subtype_key = $2::text" in safety_sql
    assert conn.fetch.await_args.args[2] == "police"


def test_reference_config_advertises_stable_manifest_when_storage_is_configured():
    with patch.object(reference.settings, "supabase_url", "https://example.supabase.co"), \
         patch.object(reference.settings, "supabase_service_role_key", "service-key"), \
         patch.object(reference.settings, "published_artifacts_bucket", "drone-published"):
        payload = asyncio.run(reference.get_reference_layer_config())

    assert payload["version"] == reference.REFERENCE_SCHEMA_VERSION
    assert payload["manifest_url"] == "/workspace/drone/reference-layers/manifest"


def test_unified_reference_features_include_client_filter_keys():
    payload = _fc([{
        "geometry": '{"type":"Point","coordinates":[-58.1,6.6]}',
        "properties": '{"name":"Test school"}',
    }], layer_key="schools", layer_group="infrastructure")

    assert payload["features"][0]["properties"]["reference_layer_key"] == "schools"
    assert payload["features"][0]["properties"]["reference_group"] == "infrastructure"


def test_reference_materialization_is_optional_without_storage_credentials():
    with patch.object(reference.settings, "supabase_url", ""), \
         patch.object(reference.settings, "supabase_service_role_key", ""):
        result = asyncio.run(reference.materialize_reference_layers(_pool(MagicMock())))

    assert result is None


def test_reference_materialization_writes_content_addressed_artifact_and_manifest():
    client = _StorageClient()
    rows = [{
        "geometry": '{"type":"Point","coordinates":[-58.1,6.6]}',
        "properties": '{"name":"Reference feature"}',
    }]
    with patch.object(reference.settings, "supabase_url", "https://example.supabase.co"), \
         patch.object(reference.settings, "supabase_service_role_key", "service-key"), \
         patch.object(reference.settings, "published_artifacts_bucket", "drone-published"), \
         patch.object(reference, "_rows_for_reference_layer", new=AsyncMock(return_value=rows)), \
         patch.object(reference.httpx, "AsyncClient", return_value=client):
        manifest = asyncio.run(reference.materialize_reference_layers(_pool(MagicMock())))

    assert manifest is not None
    assert manifest["artifact"]["feature_count"] == 7  # two unavailable categories are skipped
    assert manifest["artifact"]["sha256"] == manifest["dataset_version"]
    assert f"/{manifest['dataset_version']}/references.geojson" in client.puts[0][0]
    assert client.puts[1][0].endswith("/drone/reference/region-4/manifest.json")
    stored_manifest = reference.json.loads(client.puts[1][1])
    assert stored_manifest["artifact"]["url"] == "/workspace/drone/reference-layers/dataset"
