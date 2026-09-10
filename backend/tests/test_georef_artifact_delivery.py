import hashlib

import pytest

from app.services.georef_artifact_delivery import (
    IMMUTABLE_CACHE_CONTROL,
    artifact_manifest,
    canonical_json_bytes,
    content_addressed_path,
    delivered_artifact_url,
    verify_artifact,
)


def test_canonical_json_is_reproducible_and_content_addressed():
    body = canonical_json_bytes({"z": 1, "a": [True, None]})
    assert body == b'{"a":[true,null],"z":1}'
    digest = hashlib.sha256(body).hexdigest()
    assert content_addressed_path("river-names", body) == f"river-names/{digest}.json"


def test_manifest_records_integrity_size_and_immutable_policy():
    body = b'{"type":"FeatureCollection","features":[]}'
    manifest = artifact_manifest(
        namespace="river-names",
        body=body,
        packaged_path="backend/app/data/river_names/guyana/artifact.json",
    )
    assert manifest["artifact"]["sha256"] == hashlib.sha256(body).hexdigest()
    assert manifest["artifact"]["byte_size"] == len(body)
    assert manifest["artifact"]["cache_control"] == IMMUTABLE_CACHE_CONTROL


def test_checksum_and_size_are_verified():
    body = b"artifact"
    manifest = artifact_manifest(namespace="x", body=body, packaged_path="x.json")
    verify_artifact(body, manifest)
    manifest["artifact"]["sha256"] = "0" * 64
    with pytest.raises(ValueError, match="checksum"):
        verify_artifact(body, manifest)


def test_cdn_is_optional_and_uses_the_packaged_route_by_default(monkeypatch):
    manifest = {"artifact": {"object_path": "river-names/guyana/a.json"}}
    monkeypatch.delenv("GEOREF_ARTIFACT_CDN_BASE_URL", raising=False)
    assert delivered_artifact_url(manifest, "/georef/river-names/guyana/a") == "/georef/river-names/guyana/a"
    monkeypatch.setenv("GEOREF_ARTIFACT_CDN_BASE_URL", "https://cdn.example.test/georef")
    assert delivered_artifact_url(manifest, "/fallback") == "https://cdn.example.test/georef/river-names/guyana/a.json"
