"""Run procedural georeferencing checks; retain numeric results, not derivatives.

Example: python scripts/benchmark_georef.py --request request.json --output results.json
Use --clip clip.json for an offline ClipResult snapshot instead of DATABASE_URL.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.database import db
from app.models.clip_models import ClipResult
from app.models.export_models import ExportRequest
from app.repository.river_repository import RiverRepository
from app.services.clipping_service import ClippingService
from app.services.georef_benchmark import evaluate
from app.services.rules_service import rules_service


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--request", type=Path, required=True, help="ExportRequest JSON"
    )
    parser.add_argument("--clip", type=Path, help="Optional offline ClipResult JSON")
    parser.add_argument(
        "--output", type=Path, required=True, help="New numeric report JSON"
    )
    args = parser.parse_args()
    if args.output.exists():
        parser.error("Output already exists; choose a new filename")
    request = ExportRequest.model_validate_json(
        args.request.read_text(encoding="utf-8")
    )
    try:
        if args.clip:
            rules_service._load_from_hardcoded()
            clip = ClipResult.model_validate_json(args.clip.read_text(encoding="utf-8"))
        else:
            await db.connect()
            if db.pool is None:
                raise RuntimeError(
                    "Database unavailable; configure DATABASE_URL or supply --clip"
                )
            await rules_service.load(db.pool)
            clip = await ClippingService.clip_rivers(
                RiverRepository(db.pool),
                request.geography_id,
                request.density_preset,
                request.classification_preset,
            )
        report = await asyncio.to_thread(evaluate, clip, request)
        report["request"] = request.model_dump(mode="json")
        report["rules_source"] = rules_service.source
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("x", encoding="utf-8") as output:
            json.dump(report, output, indent=2, allow_nan=False)
        passed = sum(case["status"] == "passed" for case in report["recipes"])
        print(
            f"{passed}/{len(report['recipes'])} passed. Numeric report: {args.output}"
        )
        return 0 if passed == len(report["recipes"]) else 1
    finally:
        await db.disconnect()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
