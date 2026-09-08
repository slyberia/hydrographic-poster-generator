"""Versioned, packaged river-name artifacts for optional map inspection.

HydroRIVERS remains authoritative for rendering and QC. These small OSM-derived
artifacts are loaded only when a viewer asks for names and never alter results.
"""

import hashlib
import json
from pathlib import Path
from typing import Any


DATA_ROOT = Path(__file__).resolve().parent.parent / "data" / "river_names"
COUNTRIES = {"3d43dc73-e0ba-4abf-ab0b-b73729f66a70": "guyana"}


def _read(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError("River-name artifact is unavailable.")
    return json.loads(path.read_text(encoding="utf-8"))


def manifest_for_geography(geography_id: str) -> dict[str, Any]:
    country = COUNTRIES.get(geography_id)
    if not country:
        raise FileNotFoundError("River names have not been evaluated for this geography.")
    manifest = _read(DATA_ROOT / country / "manifest.json")
    version = manifest["dataset_version"]
    manifest["artifact"]["url"] = f"/georef/river-names/{country}/{version}"
    return manifest


def dataset(country: str, version: str) -> dict[str, Any]:
    if country not in set(COUNTRIES.values()) or len(version) != 64:
        raise FileNotFoundError("River-name artifact is unavailable.")
    manifest = _read(DATA_ROOT / country / "manifest.json")
    if version != manifest.get("dataset_version"):
        raise FileNotFoundError("River-name artifact version is unavailable.")
    path = DATA_ROOT / country / manifest["artifact"]["path"]
    body = path.read_bytes()
    if hashlib.sha256(body).hexdigest() != version:
        raise ValueError("River-name artifact checksum does not match its manifest.")
    return json.loads(body)
