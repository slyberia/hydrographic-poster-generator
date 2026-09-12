"""Deterministic review decisions for packaged country evaluation manifests.

This phase intentionally consumes existing manifests only. It does not fetch
sources, rebuild artifacts, or change country classifications.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


DATA_ROOT = Path(__file__).resolve().parent.parent / "data" / "river_names"
REGISTRY_PATH = DATA_ROOT / "country_registry.json"


def load_registry(path: Path = REGISTRY_PATH) -> dict[str, Any]:
    registry = json.loads(path.read_text(encoding="utf-8"))
    countries = registry.get("countries")
    if registry.get("schema_version") != 1 or not isinstance(countries, list):
        raise ValueError("Invalid country registry.")
    for item in countries:
        if not item.get("slug") or not item.get("manifest") or not item.get("status") or not item.get("profile"):
            raise ValueError("Registry entries require slug, profile, manifest, and status.")
    return registry


def _check(check_id: str, status: str, evidence: dict[str, Any]) -> dict[str, Any]:
    return {"id": check_id, "status": status, "evidence": evidence}


def review_manifest(manifest: dict[str, Any], expected_status: str | None = None) -> dict[str, Any]:
    evaluation = manifest.get("evaluation") or {}
    targets = evaluation.get("targets") or {}
    summary = evaluation.get("target_summary") or {}
    passed = summary.get("passed")
    failed = summary.get("failed")
    evaluated = summary.get("evaluated")
    checks: list[dict[str, Any]] = []

    reference = evaluation.get("independent_reference")
    checks.append(_check(
        "source_provenance",
        "pass" if isinstance(reference, dict) and reference.get("publisher") and reference.get("title") else "review_required",
        {"publisher": reference.get("publisher") if isinstance(reference, dict) else None},
    ))

    artifact = manifest.get("artifact") or {}
    artifact_ok = all(artifact.get(key) not in (None, "") for key in ("path", "sha256", "byte_size"))
    checks.append(_check("artifact_integrity_metadata", "pass" if artifact_ok else "fail", {"artifact": artifact}))

    summary_ok = (
        isinstance(targets, dict)
        and isinstance(evaluated, int)
        and isinstance(passed, int)
        and isinstance(failed, int)
        and evaluated == len(targets)
        and passed + failed == evaluated
    )
    checks.append(_check(
        "target_accounting",
        "pass" if summary_ok else "review_required",
        {"target_count": len(targets), "target_summary": summary},
    ))

    country_status = manifest.get("coverage_status") or evaluation.get("coverage_status") or evaluation.get("status")
    status_ok = expected_status is None or country_status == expected_status
    checks.append(_check(
        "country_status_consistency",
        "pass" if status_ok else "review_required",
        {"expected": expected_status, "observed": country_status},
    ))

    zero_source = sorted(name for name, item in targets.items() if item.get("source_object_count") == 0)
    checks.append(_check(
        "missing_source_objects",
        "pass" if not zero_source else "pass_with_limitation",
        {"targets": zero_source, "classification": "not_evaluated" if zero_source else None},
    ))

    statuses = {item["status"] for item in checks}
    disposition = "blocked" if "fail" in statuses else "review_required" if "review_required" in statuses else "accepted_with_limitations" if "pass_with_limitation" in statuses else "accepted"
    return {
        "schema_version": 1,
        "country": manifest.get("country"),
        "country_code": manifest.get("country_code"),
        "observed_country_status": country_status,
        "disposition": disposition,
        "checks": checks,
    }


def review_registered_countries(registry_path: Path = REGISTRY_PATH) -> list[dict[str, Any]]:
    registry = load_registry(registry_path)
    results = []
    for item in registry["countries"]:
        if not item.get("regression_fixture"):
            continue
        manifest = json.loads((DATA_ROOT / item["manifest"]).read_text(encoding="utf-8"))
        results.append(review_manifest(manifest, item["status"]))
    return results
