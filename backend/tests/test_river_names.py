import hashlib
import json

import pytest

from app.services.river_name_service import dataset, manifest_for_geography
from scripts.build_river_name_artifact import canonical_name


GUYANA_ID = "3d43dc73-e0ba-4abf-ab0b-b73729f66a70"


def test_multilingual_and_alternate_names_are_normalized():
    assert canonical_name("Río Cuyuní, Guyana") == "Cuyuni River"
    assert canonical_name("Corantijn, Suriname") == "Corentyne River"


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
