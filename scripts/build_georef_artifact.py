"""Build a deterministic content-addressed JSON artifact and manifest.

This packaging step is intentionally storage-neutral. The output directory can
be uploaded to GCS/CDN by deployment tooling; the packaged copy remains the
offline fallback used by the application.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.services.georef_artifact_delivery import artifact_manifest, canonical_json_bytes


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--namespace", required=True)
    args = parser.parse_args()
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    body = canonical_json_bytes(payload)
    manifest = artifact_manifest(
        namespace=args.namespace,
        body=body,
        packaged_path=str(args.input),
    )
    artifact = manifest["artifact"]
    artifact_path = args.output_dir / artifact["object_path"]
    manifest_path = args.output_dir / args.namespace / "manifest.json"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_bytes(body)
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"artifact": str(artifact_path), "manifest": str(manifest_path), **artifact}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
