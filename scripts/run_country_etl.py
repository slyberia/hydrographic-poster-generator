"""Run the bounded country ETL through staging and the HITL review gate."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import tempfile
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT))

from app.services.georef_country_pipeline import DATA_ROOT, load_registry, review_manifest
from scripts.build_river_name_artifact import hydro_clip, load_profile, osm_snapshot, publish


def run_one(item: dict, *, api_base: str, nominatim: str, output_root: Path, keep_staging: bool) -> dict:
    profile_path = DATA_ROOT / item["profile"]
    if not profile_path.is_file():
        return {"slug": item["slug"], "status": "not_evaluated", "reason": "profile_missing"}
    profile = load_profile(profile_path)
    if profile.get("profile_mode") == "no_named_perennial_river_systems":
        return {
            "slug": item["slug"],
            "status": "unavailable",
            "disposition": "accepted_with_limitations",
            "published": False,
            "reason": "authoritative profile documents no named perennial river systems for this bounded evaluation",
            "independent_reference": profile["independent_reference"],
        }
    staging = Path(tempfile.mkdtemp(prefix=f"georef-{item['slug']}-"))
    try:
        snapshot = osm_snapshot(profile, nominatim)
        hydro = hydro_clip(api_base, profile["geography_id"])
        result = publish(profile, snapshot, hydro, staging)
        review = review_manifest(result["manifest"], item.get("expected_status"))
        accepted = review["disposition"] in {"accepted", "accepted_with_limitations"}
        if accepted:
            destination = output_root / profile["slug"]
            destination.mkdir(parents=True, exist_ok=True)
            for path in staging.iterdir():
                shutil.copy2(path, destination / path.name)
        return {
            "slug": item["slug"],
            "status": result["manifest"].get("coverage_status", "not_evaluated"),
            "disposition": review["disposition"],
            "published": accepted,
            "review": review,
        }
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        if exc.code == 400 and "Geography" in detail and "not found" in detail:
            return {"slug": item["slug"], "status": "unavailable", "disposition": "accepted_with_limitations", "published": False, "reason": "runtime HydroRIVERS clip is unavailable for the registered geography", "detail": detail}
        return {"slug": item["slug"], "status": "not_evaluated", "disposition": "blocked", "published": False, "reason": f"HTTP {exc.code}", "detail": detail}
    except Exception as exc:  # noqa: BLE001 - report country failure without hiding the batch result
        return {"slug": item["slug"], "status": "not_evaluated", "disposition": "blocked", "published": False, "reason": str(exc)}
    finally:
        if not keep_staging:
            shutil.rmtree(staging, ignore_errors=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--country")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--unevaluated-only", action="store_true")
    parser.add_argument("--api-base", default="https://hydro-backend-54n4ik523a-uc.a.run.app")
    parser.add_argument("--nominatim", default="https://nominatim.openstreetmap.org/search")
    parser.add_argument("--output-root", type=Path, default=DATA_ROOT)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--keep-staging", action="store_true")
    args = parser.parse_args()
    entries = load_registry()["countries"]
    if args.all and args.unevaluated_only:
        parser.error("--all and --unevaluated-only are mutually exclusive")
    if args.unevaluated_only:
        selected = [item for item in entries if item.get("status") == "not_evaluated"]
    elif args.all:
        selected = entries
    else:
        selected = [item for item in entries if item["slug"] == args.country]
        if not selected:
            parser.error("--country must name a registered country")
    report = [run_one(item, api_base=args.api_base, nominatim=args.nominatim, output_root=args.output_root, keep_staging=args.keep_staging) for item in selected]
    body = json.dumps({"schema_version": 1, "countries": report}, indent=2, sort_keys=True) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(body, encoding="utf-8")
    print(body, end="")
    return 0 if all(item.get("disposition") != "blocked" for item in report) else 1


if __name__ == "__main__":
    raise SystemExit(main())
