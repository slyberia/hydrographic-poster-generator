"""Run the deterministic HITL review stage for an existing country artifact."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.services.georef_country_pipeline import DATA_ROOT, load_registry, review_manifest, review_registered_countries


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--country")
    parser.add_argument("--all-regression", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    registry = load_registry()
    if args.all_regression:
        report = {"schema_version": 1, "countries": review_registered_countries()}
    else:
        item = next((entry for entry in registry["countries"] if entry["slug"] == args.country), None)
        if item is None:
            parser.error("--country must name a registered country")
        manifest = json.loads((DATA_ROOT / item["manifest"]).read_text(encoding="utf-8"))
        report = review_manifest(manifest, item["status"])
    text = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
