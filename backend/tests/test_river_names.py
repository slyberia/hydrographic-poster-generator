import hashlib
import json

import pytest

from app.services.river_name_service import dataset, manifest_for_geography
from scripts.build_river_name_artifact import canonical_name, load_profile


GUYANA_ID = "3d43dc73-e0ba-4abf-ab0b-b73729f66a70"
BELIZE_ID = "3060e4d0-361c-4095-808e-bccfffb8426f"
JAMAICA_ID = "3918122c-61f6-43cb-84cf-5e8213ab0b23"
COSTA_RICA_ID = "cbbb4aa4-65ec-42d4-ba69-3428318e2442"
SURINAME_ID = "91d56b28-6b91-4b64-bff6-4ed789a75577"


def test_multilingual_and_alternate_names_are_normalized():
    profile = load_profile("guyana")
    assert canonical_name("Río Cuyuní, Guyana", profile) == "Cuyuni River"
    assert canonical_name("Corantijn, Suriname", profile) == "Corentyne River"


def test_guyana_artifact_is_content_addressed_and_passes_all_targets():
    manifest = manifest_for_geography(GUYANA_ID)
    version = manifest["dataset_version"]
    result = dataset("guyana", version)
    canonical = json.dumps(result, separators=(",", ":"), sort_keys=True).encode()

    assert hashlib.sha256(canonical).hexdigest() == version
    assert manifest["evaluation"]["status"] == "passed"
    assert len(manifest["evaluation"]["targets"]) == 8
    assert all(item["matched_reach_count"] > 0 for item in manifest["evaluation"]["targets"].values())
    assert manifest["artifact"]["indexed_reach_count"] == len(result["name_index"])
    assert {item["name_status"] for item in result["name_index"].values()} == {
        "matched", "ambiguous", "unnamed_in_source"
    }
    assert "completeness varies" in result["metadata"]["disclaimer"].casefold()


def test_unsupported_country_and_version_are_not_fabricated():
    with pytest.raises(FileNotFoundError):
        manifest_for_geography("not-supported")
    with pytest.raises(FileNotFoundError):
        dataset("guyana", "0" * 64)


def test_belize_profile_is_independently_scoped():
    profile = load_profile("belize")
    assert profile["geography_id"] == BELIZE_ID
    assert profile["independent_reference"]["publisher"] == "Government of Belize"
    assert len(profile["targets"]) == 8
    assert canonical_name("Río Hondo, Belize", profile) == "Rio Hondo"
    assert canonical_name("Belize Old River", profile) == "Belize River"


def test_belize_artifact_is_partial_without_fabricating_rio_hondo():
    manifest = manifest_for_geography(BELIZE_ID)
    result = dataset("belize", manifest["dataset_version"])
    canonical = json.dumps(result, separators=(",", ":"), sort_keys=True).encode()

    assert hashlib.sha256(canonical).hexdigest() == manifest["dataset_version"]
    assert manifest["coverage_status"] == "partial"
    assert manifest["evaluation"]["target_summary"] == {
        "evaluated": 8, "passed": 7, "failed": 1
    }
    assert manifest["evaluation"]["targets"]["Rio Hondo"]["matched_reach_count"] == 0
    assert manifest["evaluation"]["targets"]["Sibun River"]["source_object_count"] == 1
    assert manifest["artifact"]["indexed_reach_count"] == len(result["name_index"])
    assert all(
        feature["properties"]["source_category"] == "waterway"
        and feature["properties"]["source_type"] in {"river", "stream"}
        for feature in result["features"]
    )
    assert {item["name_status"] for item in result["name_index"].values()} <= {
        "matched", "ambiguous", "unnamed_in_source"
    }


def test_jamaica_artifact_is_content_addressed_and_records_partial_coverage():
    profile = load_profile("jamaica")
    assert profile["geography_id"] == JAMAICA_ID
    assert profile["independent_reference"]["publisher"] == "Jamaica Water Resources Authority"
    assert canonical_name("Great River, Jamaica", profile) == "Great River"

    manifest = manifest_for_geography(JAMAICA_ID)
    result = dataset("jamaica", manifest["dataset_version"])
    canonical = json.dumps(result, separators=(",", ":"), sort_keys=True).encode()

    assert hashlib.sha256(canonical).hexdigest() == manifest["dataset_version"]
    assert manifest["coverage_status"] == "partial"
    assert manifest["evaluation"]["target_summary"] == {
        "evaluated": 5, "passed": 4, "failed": 1
    }
    assert manifest["evaluation"]["targets"]["Montego River"]["matched_reach_count"] == 0
    assert manifest["artifact"]["indexed_reach_count"] == len(result["name_index"])


def test_costa_rica_artifact_is_content_addressed_and_passes_all_targets():
    profile = load_profile("costa-rica")
    assert profile["geography_id"] == COSTA_RICA_ID
    assert profile["independent_reference"]["publisher"] == "Comisión Nacional de Emergencias de Costa Rica"
    assert canonical_name("Río Tárcoles, Costa Rica", profile) == "Tárcoles River"

    manifest = manifest_for_geography(COSTA_RICA_ID)
    result = dataset("costa-rica", manifest["dataset_version"])
    canonical = json.dumps(result, separators=(",", ":"), sort_keys=True).encode()

    assert hashlib.sha256(canonical).hexdigest() == manifest["dataset_version"]
    assert manifest["coverage_status"] == "verified"
    assert manifest["evaluation"]["target_summary"] == {
        "evaluated": 6, "passed": 6, "failed": 0
    }
    assert manifest["artifact"]["indexed_reach_count"] == len(result["name_index"])


def test_suriname_artifact_is_content_addressed_and_records_partial_coverage():
    profile = load_profile("suriname")
    assert profile["geography_id"] == SURINAME_ID
    assert profile["independent_reference"]["publisher"] == "Government of Suriname"
    assert canonical_name("Marowijne River, Suriname", profile) == "Marowijne River"

    manifest = manifest_for_geography(SURINAME_ID)
    result = dataset("suriname", manifest["dataset_version"])
    canonical = json.dumps(result, separators=(",", ":"), sort_keys=True).encode()

    assert hashlib.sha256(canonical).hexdigest() == manifest["dataset_version"]
    assert manifest["coverage_status"] == "partial"
    assert manifest["evaluation"]["target_summary"] == {
        "evaluated": 7, "passed": 3, "failed": 4
    }
    assert {
        name for name, item in manifest["evaluation"]["targets"].items()
        if item["source_object_count"] == 0
    } == {"Saramacca River", "Coppename River", "Nickerie River", "Corantijn River"}
    assert manifest["artifact"]["indexed_reach_count"] == len(result["name_index"])
