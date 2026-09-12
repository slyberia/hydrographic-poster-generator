"""Build a bounded, versioned river-name artifact for one approved country.

Country profiles define independently referenced target systems and aliases.
The build performs bounded OSM discovery and one HydroRIVERS clip offline.
Runtime application requests never call OSM or Nominatim, and published
artifacts never contain HydroRIVERS geometry.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import statistics
import time
import unicodedata
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


DATA_ROOT = Path(__file__).resolve().parents[1] / "backend" / "app" / "data" / "river_names"
MATCH_RADIUS_M = 4_000.0
MATCHED_COVERAGE = 0.55
AMBIGUOUS_COVERAGE = 0.20
SAMPLE_STEP_M = 1_500.0


def load_profile(country: str | Path) -> dict[str, Any]:
    path = Path(country)
    if path.suffix != ".json":
        path = DATA_ROOT / str(country) / "build-profile.json"
    profile = json.loads(path.read_text(encoding="utf-8"))
    required = {"slug", "country", "country_code", "geography_id", "targets", "independent_reference"}
    if not required.issubset(profile) or (not profile["targets"] and profile.get("profile_mode") != "no_named_perennial_river_systems"):
        raise ValueError(f"Incomplete country build profile: {path}")
    names = [target.get("name") for target in profile["targets"]]
    if any(not name for name in names) or len(names) != len(set(names)):
        raise ValueError("Country targets require unique canonical names.")
    for target in profile["targets"]:
        if not target.get("aliases") or not target.get("queries"):
            raise ValueError(f"Target {target.get('name')} requires aliases and queries.")
    return profile


def request_json(url: str, *, data: bytes | None = None) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json" if data else "application/x-www-form-urlencoded",
            "User-Agent": "HydroPosterRiverNames/2.0 (bounded offline dataset build)",
        },
        method="POST" if data else "GET",
    )
    with urllib.request.urlopen(request, timeout=240) as response:
        return json.load(response)


def canonical_name(value: str | None, profile: dict[str, Any]) -> str | None:
    if not value:
        return None
    ascii_name = unicodedata.normalize("NFKD", value.casefold()).encode("ascii", "ignore").decode()
    normalized = re.sub(r"[^a-z]+", " ", ascii_name).strip()
    for target in profile["targets"]:
        if any(re.search(rf"\b{re.escape(alias.casefold())}\b", normalized)
               for alias in target["aliases"]):
            return target["name"]
    return None


def mercator(lon: float, lat: float) -> tuple[float, float]:
    lat = max(-85.05112878, min(85.05112878, lat))
    radius = 6_378_137.0
    return radius * math.radians(lon), radius * math.log(
        math.tan(math.pi / 4 + math.radians(lat) / 2)
    )


def densify(
    points: list[tuple[float, float]], step: float = SAMPLE_STEP_M
) -> list[tuple[float, float]]:
    if len(points) < 2:
        return points
    result = [points[0]]
    for start, end in zip(points, points[1:]):
        pieces = max(1, math.ceil(math.dist(start, end) / step))
        result.extend(
            (
                start[0] + (end[0] - start[0]) * i / pieces,
                start[1] + (end[1] - start[1]) * i / pieces,
            )
            for i in range(1, pieces + 1)
        )
    return result


def lines(geometry: dict[str, Any]) -> Iterable[list[list[float]]]:
    if geometry.get("type") == "LineString":
        yield geometry["coordinates"]
    elif geometry.get("type") == "MultiLineString":
        yield from geometry["coordinates"]


def osm_snapshot(profile: dict[str, Any], nominatim: str) -> dict[str, Any]:
    named: list[dict[str, Any]] = []
    seen_lines: set[str] = set()
    for target in profile["targets"]:
        for search_query in target["queries"]:
            query = urllib.parse.urlencode({
                "q": search_query,
                "format": "jsonv2",
                "polygon_geojson": 1,
                "limit": 50,
                "dedupe": 0,
            })
            request = urllib.request.Request(
                f"{nominatim.rstrip('/')}?{query}",
                headers={"User-Agent": "HydroPosterRiverNames/2.0 (bounded offline dataset build)"},
            )
            with urllib.request.urlopen(request, timeout=120) as response:
                results = json.load(response)
            for result in results:
                name = canonical_name(result.get("display_name"), profile)
                geometry = result.get("geojson", {})
                if (
                    name != target["name"]
                    or result.get("category") != "waterway"
                    or result.get("type") not in ("river", "stream")
                    or geometry.get("type") not in (
                    "LineString", "MultiLineString"
                    )
                ):
                    continue
                for coordinates in lines(geometry):
                    fingerprint = hashlib.sha256(
                        json.dumps(coordinates, separators=(",", ":")).encode()
                    ).hexdigest()
                    if fingerprint in seen_lines:
                        continue
                    seen_lines.add(fingerprint)
                    named.append({
                        "type": "Feature",
                        "geometry": {"type": "LineString", "coordinates": coordinates},
                        "properties": {
                            "name": target["name"],
                            "source_name": result.get("display_name", "").split(",", 1)[0],
                            "osm_type": result.get("osm_type"),
                            "osm_id": result.get("osm_id"),
                            "source_category": result.get("category"),
                            "source_type": result.get("type"),
                            "name_status": "matched",
                        },
                    })
            time.sleep(1.05)

    evidence = profile.get("unnamed_reach_evidence", {})
    ids = sorted({int(value) for value in evidence.values()})
    verified: set[int] = set()
    if ids:
        request = urllib.request.Request(
            "https://api.openstreetmap.org/api/0.6/ways.json?ways=" + ",".join(map(str, ids)),
            headers={"User-Agent": "HydroPosterRiverNames/2.0 (bounded offline dataset build)"},
        )
        with urllib.request.urlopen(request, timeout=120) as response:
            elements = json.load(response).get("elements", [])
        verified = {
            element["id"]
            for element in elements
            if element.get("type") == "way"
            and element.get("tags", {}).get("waterway") in ("river", "stream")
            and not element.get("tags", {}).get("name")
        }
    return {
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "source": "OpenStreetMap contributors",
        "license": "ODbL 1.0",
        "query_scope": (
            f"{len(profile['targets'])} independently referenced "
            f"{profile['country']} river systems"
        ),
        "named_features": named,
        "unnamed_evidence": [
            {"osm_type": "way", "osm_id": osm_id, "verified_unnamed": osm_id in verified}
            for osm_id in ids
        ],
    }


def hydro_clip(api_base: str, geography_id: str) -> dict[str, Any]:
    body = json.dumps({
        "geography_id": geography_id,
        "density_preset": "balanced",
        "classification_preset": "standard",
    }).encode()
    return request_json(f"{api_base.rstrip('/')}/clip", data=body)


def build_index(
    snapshot: dict[str, Any], hydro: dict[str, Any], profile: dict[str, Any]
) -> tuple[dict[str, Any], dict[str, Any]]:
    grid: dict[tuple[int, int], list[tuple[float, float, str, str]]] = defaultdict(list)
    source_objects: dict[str, set[str]] = defaultdict(set)
    for feature in snapshot["named_features"]:
        props = feature["properties"]
        name = props["name"]
        source_ref = f"{props['osm_type']}/{props['osm_id']}"
        source_objects[name].add(source_ref)
        points = [mercator(*coordinate) for coordinate in feature["geometry"]["coordinates"]]
        for x, y in densify(points):
            grid[(math.floor(x / MATCH_RADIUS_M), math.floor(y / MATCH_RADIUS_M))].append(
                (x, y, name, source_ref)
            )

    index: dict[str, dict[str, Any]] = {}
    distances_by_name: dict[str, list[float]] = defaultdict(list)
    for feature in hydro.get("features", []):
        props = feature.get("properties", {})
        reach_id = str(props.get("hydrorivers_id", ""))
        samples = [
            point
            for line in lines(feature.get("geometry", {}))
            for point in densify([(float(x), float(y)) for x, y, *_ in line])
        ]
        if not reach_id or not samples:
            continue

        votes: list[tuple[str, float, str]] = []
        for x, y in samples:
            gx, gy = math.floor(x / MATCH_RADIUS_M), math.floor(y / MATCH_RADIUS_M)
            candidates = [
                candidate
                for dx in (-1, 0, 1)
                for dy in (-1, 0, 1)
                for candidate in grid.get((gx + dx, gy + dy), [])
            ]
            if not candidates:
                continue
            nearest = min(
                candidates,
                key=lambda candidate: (candidate[0] - x) ** 2 + (candidate[1] - y) ** 2,
            )
            distance = math.hypot(nearest[0] - x, nearest[1] - y)
            if distance <= MATCH_RADIUS_M:
                votes.append((nearest[2], distance, nearest[3]))
        if not votes:
            continue

        counts = Counter(vote[0] for vote in votes)
        name, count = counts.most_common(1)[0]
        dominant = [vote for vote in votes if vote[0] == name]
        coverage = count / len(samples)
        dominance = count / len(votes)
        median_distance = statistics.median(vote[1] for vote in dominant)
        status = "matched" if coverage >= MATCHED_COVERAGE and dominance >= 0.75 else "ambiguous"
        if coverage < AMBIGUOUS_COVERAGE:
            continue
        confidence = max(
            0.0,
            min(1.0, coverage * dominance * (1 - median_distance / (MATCH_RADIUS_M * 2))),
        )
        index[reach_id] = {
            "name_status": status,
            "name": name if status == "matched" else None,
            "candidate_name": name,
            "confidence": round(confidence, 3),
            "coverage": round(coverage, 3),
            "median_distance_m": round(median_distance, 1),
            "source_refs": sorted({vote[2] for vote in dominant})[:12],
        }
        if status == "matched":
            distances_by_name[name].extend(vote[1] for vote in dominant)

    evidence = profile.get("unnamed_reach_evidence", {})
    verified = {
        item["osm_id"]
        for item in snapshot["unnamed_evidence"]
        if item["verified_unnamed"]
    }
    for reach_id, osm_id in evidence.items():
        if int(osm_id) in verified and reach_id not in index:
            index[reach_id] = {
                "name_status": "unnamed_in_source",
                "name": None,
                "confidence": 0.7,
                "source_refs": [f"way/{osm_id}"],
            }

    per_target: dict[str, dict[str, Any]] = {}
    for target in profile["targets"]:
        name = target["name"]
        distances = sorted(distances_by_name[name])
        per_target[name] = {
            "source_object_count": len(source_objects[name]),
            "display_segment_count": sum(
                feature["properties"]["name"] == name
                for feature in snapshot["named_features"]
            ),
            "matched_reach_count": sum(
                value.get("name") == name and value["name_status"] == "matched"
                for value in index.values()
            ),
            "median_distance_m": round(statistics.median(distances), 1) if distances else None,
            "p95_distance_m": (
                round(distances[min(len(distances) - 1, math.floor(len(distances) * 0.95))], 1)
                if distances else None
            ),
        }
    passed_targets = sum(
        bool(item["source_object_count"] and item["matched_reach_count"])
        for item in per_target.values()
    )
    coverage_status = (
        "verified"
        if passed_targets == len(per_target)
        else "partial"
        if passed_targets
        else "unavailable"
    )
    evaluation = {
        "schema_version": 2,
        "status": "passed" if coverage_status == "verified" else "warning",
        "coverage_status": coverage_status,
        "independent_reference": profile["independent_reference"],
        "target_summary": {
            "evaluated": len(per_target),
            "passed": passed_targets,
            "failed": len(per_target) - passed_targets,
        },
        "targets": per_target,
        "counts": dict(Counter(value["name_status"] for value in index.values())),
        "limitations": [
            "This is source-to-source agreement, not surveyed ground truth.",
            "Completeness varies with OSM coverage, language, river segmentation and local naming practice.",
            "Independent references validate the evaluation scope, not every OSM geometry or name.",
            "A name is shown only when the matcher reaches its threshold; ambiguous results abstain.",
        ],
    }
    return index, evaluation


def publish(
    profile: dict[str, Any],
    snapshot: dict[str, Any],
    hydro: dict[str, Any],
    output: Path,
) -> dict[str, Any]:
    name_index, evaluation = build_index(snapshot, hydro, profile)
    disclaimer = (
        "River-name completeness varies by country, language, OSM coverage, "
        "segmentation and local mapping practice."
    )
    artifact = {
        "type": "FeatureCollection",
        "metadata": {
            "schema_version": "river-names-v2",
            "country": profile["country"],
            "country_code": profile["country_code"],
            "geography_id": profile["geography_id"],
            "source": "OpenStreetMap contributors",
            "source_license": "ODbL 1.0",
            "hydrorivers_source": "HydroRIVERS v1.0 (WWF)",
            "method": "offline spatial association with confidence-scored abstention",
            "disclaimer": disclaimer,
            "evaluated_systems": [target["name"] for target in profile["targets"]],
        },
        "name_index": name_index,
        "features": snapshot["named_features"],
    }
    body = json.dumps(artifact, separators=(",", ":"), sort_keys=True).encode()
    version = hashlib.sha256(body).hexdigest()
    output.mkdir(parents=True, exist_ok=True)
    artifact_path = output / f"{version}.json"
    artifact_path.write_bytes(body)
    manifest = {
        "schema_version": 2,
        "country": profile["country"],
        "country_code": profile["country_code"],
        "geography_id": profile["geography_id"],
        "dataset_version": version,
        "generated_at": snapshot["captured_at"],
        "coverage_status": evaluation["coverage_status"],
        "artifact": {
            "path": artifact_path.name,
            "sha256": version,
            "byte_size": len(body),
            "feature_count": len(artifact["features"]),
            "indexed_reach_count": len(name_index),
        },
        "evaluation": evaluation,
        "attribution": "© OpenStreetMap contributors; ODbL 1.0",
        "disclaimer": disclaimer,
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (output / "evaluation.json").write_text(json.dumps(evaluation, indent=2), encoding="utf-8")
    source_record = {
        key: snapshot[key]
        for key in ("captured_at", "source", "license", "query_scope")
    }
    source_record["independent_reference"] = profile["independent_reference"]
    source_record["objects"] = [feature["properties"] for feature in snapshot["named_features"]]
    source_record["unnamed_evidence"] = snapshot["unnamed_evidence"]
    (output / "source-record.json").write_text(
        json.dumps(source_record, indent=2), encoding="utf-8"
    )
    return {"manifest": manifest, "evaluation": evaluation}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", default="guyana")
    parser.add_argument("--profile", type=Path)
    parser.add_argument("--api-base", default="https://hydro-backend-54n4ik523a-uc.a.run.app")
    parser.add_argument("--nominatim", default="https://nominatim.openstreetmap.org/search")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    profile = load_profile(args.profile or args.country)
    output = args.output or DATA_ROOT / profile["slug"]
    snapshot = osm_snapshot(profile, args.nominatim)
    hydro = hydro_clip(args.api_base, profile["geography_id"])
    print(json.dumps(publish(profile, snapshot, hydro, output), indent=2))


if __name__ == "__main__":
    main()
