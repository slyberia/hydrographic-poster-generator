"""Versioned, packaged river-name artifacts for optional map inspection.

HydroRIVERS remains authoritative for rendering and QC. These small OSM-derived
artifacts are loaded only when a viewer asks for names and never alter results.
"""

import hashlib
import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any


DATA_ROOT = Path(__file__).resolve().parent.parent / "data" / "river_names"
COUNTRY_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _read(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError("River-name artifact is unavailable.")
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _country_catalog() -> dict[str, str]:
    catalog: dict[str, str] = {}
    for path in sorted(DATA_ROOT.glob("*/manifest.json")):
        slug = path.parent.name
        if not COUNTRY_SLUG.fullmatch(slug):
            continue
        manifest = _read(path)
        geography_id = manifest.get("geography_id")
        if isinstance(geography_id, str) and geography_id:
            catalog[geography_id] = slug
    return catalog


def manifest_for_geography(geography_id: str) -> dict[str, Any]:
    country = _country_catalog().get(geography_id)
    if not country:
        raise FileNotFoundError("River names have not been evaluated for this geography.")
    manifest = _read(DATA_ROOT / country / "manifest.json")
    version = manifest["dataset_version"]
    manifest["artifact"]["url"] = f"/georef/river-names/{country}/{version}"
    return manifest


def dataset(country: str, version: str) -> dict[str, Any]:
    if not COUNTRY_SLUG.fullmatch(country) or len(version) != 64:
        raise FileNotFoundError("River-name artifact is unavailable.")
    manifest_path = DATA_ROOT / country / "manifest.json"
    manifest = _read(manifest_path)
    if version != manifest.get("dataset_version"):
        raise FileNotFoundError("River-name artifact version is unavailable.")
    path = DATA_ROOT / country / manifest["artifact"]["path"]
    body = path.read_bytes()
    if hashlib.sha256(body).hexdigest() != version:
        raise ValueError("River-name artifact checksum does not match its manifest.")
    return json.loads(body)
