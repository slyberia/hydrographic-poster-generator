"""Audit committed georeferencing inventory and evidence without network access.

Run from any directory with --output to retain the deterministic JSON report.
Does not rebuild, reclassify, or modify country artifacts.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.services.georef_country_pipeline import review_manifest
from app.services.river_name_service import dataset, manifest_for_geography

DATA = ROOT / "backend/app/data/river_names"
EVIDENCE = ROOT / ".agents/state/verifications"


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def relative(path):
    return path.relative_to(ROOT).as_posix()


def fingerprint(path):
    body = path.read_bytes()
    return {"path": relative(path), "sha256": hashlib.sha256(body).hexdigest(),
            "byte_size": len(body)}


def audit():
    errors, countries, evidence = [], [], []
    registry = read(DATA / "country_registry.json")["countries"]
    batch_path = EVIDENCE / "georef-country-etl-hitl/unevaluated-21-etl.json"
    batch = {row["slug"]: row for row in read(batch_path)["countries"]}
    evidence.extend([fingerprint(DATA / "country_registry.json"), fingerprint(batch_path)])
    seen_slugs, seen_geographies = set(), set()
    for entry in registry:
        slug = entry["slug"]
        if slug in seen_slugs:
            errors.append(f"Duplicate registry slug: {slug}")
        seen_slugs.add(slug)
        profile_path, manifest_path = DATA / entry["profile"], DATA / entry["manifest"]
        profile = read(profile_path)
        evidence.append(fingerprint(profile_path))
        row = {"slug": slug, "country": profile["country"], "country_code": entry["country_code"],
               "status": entry["status"], "profile": relative(profile_path),
               "manifest": relative(manifest_path), "packaged": manifest_path.is_file()}
        if not row["packaged"]:
            withheld = batch.get(slug, {})
            if withheld.get("published") is not False or withheld.get("status") != entry["status"]:
                errors.append(f"Undocumented missing manifest: {slug}")
            row["withheld_reason"] = withheld.get("reason")
            countries.append(row)
            continue
        manifest = read(manifest_path)
        evidence.append(fingerprint(manifest_path))
        art = manifest["artifact"]
        artifact_path = (manifest_path.parent / art["path"]).resolve()
        if not artifact_path.is_relative_to(DATA.resolve()):
            errors.append(f"Artifact path escapes data root: {slug}")
            countries.append(row)
            continue
        artifact = fingerprint(artifact_path)
        body = read(artifact_path)
        checks = {
            "sha256": artifact["sha256"] == art["sha256"] == manifest["dataset_version"],
            "byte_size": artifact["byte_size"] == art["byte_size"],
            "content_addressed_name": artifact_path.name == art["sha256"] + ".json",
            "feature_count": len(body["features"]) == art["feature_count"],
            "indexed_reach_count": len(body["name_index"]) == art["indexed_reach_count"],
            "country_code": manifest["country_code"] == entry["country_code"],
            "geography": manifest["geography_id"] == profile["geography_id"],
        }
        counts = dict(sorted(Counter(v["name_status"] for v in body["name_index"].values()).items()))
        checks["name_states"] = set(counts) <= {"matched", "ambiguous", "unnamed_in_source", "not_evaluated"}
        checks["evaluation_counts"] = counts == {k: v for k, v in manifest["evaluation"]["counts"].items() if v}
        status = manifest.get("coverage_status") or manifest["evaluation"].get("coverage_status") or manifest["evaluation"]["status"]
        checks["country_status"] = status == entry["status"]
        if manifest["geography_id"] in seen_geographies:
            errors.append(f"Duplicate packaged geography: {slug}")
        seen_geographies.add(manifest["geography_id"])
        try:
            runtime = manifest_for_geography(profile["geography_id"])
            checks["runtime_manifest"] = runtime["dataset_version"] == manifest["dataset_version"]
            checks["runtime_dataset"] = dataset(slug, manifest["dataset_version"]) == body
        except (ValueError, FileNotFoundError) as exc:
            checks["runtime_dataset"] = False
            errors.append(f"{slug}: {exc}")
        if slug in batch:
            checks["etl_publication"] = batch[slug]["published"] is True
            checks["etl_status"] = batch[slug]["status"] == entry["status"]
        for key, passed in checks.items():
            if not passed:
                errors.append(f"{slug}: {key}")
        row.update(artifact=artifact, checks=checks, indexed_name_states=counts,
                   display_feature_count=len(body["features"]),
                   indexed_reach_count=len(body["name_index"]),
                   target_summary=manifest["evaluation"].get("target_summary"),
                   not_evaluated_targets=sorted(name for name, target in manifest["evaluation"]["targets"].items()
                                                if target.get("source_object_count") == 0),
                   review=review_manifest(manifest, entry["status"]))
        countries.append(row)
    extra = set(p.parent.name for p in DATA.glob("*/manifest.json")) - seen_slugs
    errors.extend(f"Unregistered manifest: {slug}" for slug in sorted(extra))
    report_path = EVIDENCE / "georef-recovery-calibration/guyana-benchmark.json"
    benchmark = read(report_path)
    evidence.append(fingerprint(report_path))
    recipes = benchmark["recipes"]
    benchmark_review = {
        "report": relative(report_path), "summary": benchmark["summary"],
        "cases": [{"name": r["recipe"]["name"], "status": r["status"],
                   "p95_error_pixels": r.get("p95_error_pixels")} for r in recipes],
        "wrong_source_in_this_report": any(r["recipe"]["name"] == "wrong_source" for r in recipes),
        "belize_jamaica": "Historical release prose only; no separate current-format country benchmark reports committed.",
        "absolute_accuracy": "No surveyed control or physical capture validation.",
    }
    tracked = subprocess.check_output(["git", "ls-files", "*.parquet"], cwd=ROOT, text=True).splitlines()
    baseline = read(ROOT / ".agents/state/current_phase.json")["baseline_commit"]
    return {
        "schema_version": 1, "baseline_commit": baseline,
        "audit_status": "pass_with_documented_limitations" if not errors else "failed",
        "errors": errors, "registered_count": len(registry),
        "status_counts": dict(sorted(Counter(row["status"] for row in countries).items())),
        "packaged_count": sum(row["packaged"] for row in countries),
        "withheld_count": sum(not row["packaged"] for row in countries),
        "etl_batch": {"count": len(batch), "status_counts": dict(sorted(Counter(row["status"] for row in batch.values()).items())),
                      "published": sum(row["published"] for row in batch.values())},
        "countries": countries, "benchmark": benchmark_review,
        "tracked_geoparquet_files": tracked, "evidence_fingerprints": evidence,
        "limitations": [
            "Coverage classifications concern bounded river-name evaluation, not national completeness or Recovery support.",
            "Guyana retains legacy passed status and review_required schema/provenance findings.",
            "Source objects and display segments remain distinct; missing source objects remain not_evaluated.",
            "CDN publication and live operational readiness are not audited; browser has no automatic CDN-to-local retry.",
            "GeoParquet writer and Python tests exist; no committed country Parquet files, R execution, or complete PMTiles archive.",
            "A pass means inventory/integrity audit passed; historical validation gaps remain explicit."
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = audit()
    payload = json.dumps(report, indent=2, sort_keys=True, ensure_ascii=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8")
    print(json.dumps({key: report[key] for key in
                      ("audit_status", "errors", "registered_count", "status_counts", "packaged_count", "withheld_count", "etl_batch")}, indent=2))
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
