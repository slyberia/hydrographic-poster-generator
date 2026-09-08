"""Build the versioned Guyana river-name pilot artifact.

The script performs one bounded OSM extraction and one HydroRIVERS clip, then
joins the two sources offline. Runtime application requests never call OSM or
Nominatim. HydroRIVERS geometry is used transiently and is not written to the
published artifact.
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


TARGETS = {
    "Essequibo River": ("essequibo", "esequibo"),
    "Demerara River": ("demerara",),
    "Berbice River": ("berbice",),
    "Corentyne River": ("corentyne", "courantyne", "corantijn"),
    "Cuyuni River": ("cuyuni", "cuyun"),
    "Mazaruni River": ("mazaruni",),
    "Potaro River": ("potaro",),
    "Rupununi River": ("rupununi",),
}
UNNAMED_REACH_EVIDENCE = {
    "60031704": 54062300,
    "60038486": 301513640,
    "60038915": 301513640,
    "60053006": 55946216,
    "60062395": 54896501,
    "60063183": 54896504,
    "60085249": 378593043,
    "60088075": 55503918,
    "60091509": 55503920,
    "60096166": 55503915,
}
MATCH_RADIUS_M = 4_000.0
MATCHED_COVERAGE = 0.55
AMBIGUOUS_COVERAGE = 0.20
SAMPLE_STEP_M = 1_500.0


def request_json(url: str, *, data: bytes | None = None) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json" if data else "application/x-www-form-urlencoded",
            "User-Agent": "HydroPosterRiverNames/1.0 (offline dataset build)",
        },
        method="POST" if data else "GET",
    )
    with urllib.request.urlopen(request, timeout=240) as response:
        return json.load(response)


def canonical_name(value: str | None) -> str | None:
    if not value:
        return None
    ascii_name = unicodedata.normalize("NFKD", value.casefold()).encode("ascii", "ignore").decode()
    normalized = re.sub(r"[^a-z]+", " ", ascii_name).strip()
    for canonical, aliases in TARGETS.items():
        if any(re.search(rf"\b{re.escape(alias)}\b", normalized) for alias in aliases):
            return canonical
    return None


def mercator(lon: float, lat: float) -> tuple[float, float]:
    lat = max(-85.05112878, min(85.05112878, lat))
    radius = 6_378_137.0
    return radius * math.radians(lon), radius * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def densify(points: list[tuple[float, float]], step: float = SAMPLE_STEP_M) -> list[tuple[float, float]]:
    if len(points) < 2:
        return points
    result = [points[0]]
    for start, end in zip(points, points[1:]):
        distance = math.dist(start, end)
        pieces = max(1, math.ceil(distance / step))
        result.extend(
            (start[0] + (end[0] - start[0]) * i / pieces,
             start[1] + (end[1] - start[1]) * i / pieces)
            for i in range(1, pieces + 1)
        )
    return result


def lines(geometry: dict[str, Any]) -> Iterable[list[list[float]]]:
    if geometry.get("type") == "LineString":
        yield geometry["coordinates"]
    elif geometry.get("type") == "MultiLineString":
        yield from geometry["coordinates"]


def osm_snapshot(nominatim: str) -> dict[str, Any]:
    named: list[dict[str, Any]] = []
    unnamed: list[dict[str, Any]] = []
    seen_lines: set[str] = set()
    # Nominatim is used only during this small, cached pilot build. It is not a
    # runtime dependency. Requests are serialized below the public 1 req/s cap.
    for target, aliases in TARGETS.items():
        search_terms = [(target, "Guyana"), *((f"{alias} River", "Suriname" if alias == "corantijn" else "Guyana")
                         for alias in aliases if alias not in target.casefold())]
        for search_term, location in search_terms:
            query = urllib.parse.urlencode({
                "q": f"{search_term}, {location}",
                "format": "jsonv2",
                "polygon_geojson": 1,
                "limit": 50,
                "dedupe": 0,
            })
            request = urllib.request.Request(
                f"{nominatim.rstrip('/')}?{query}",
                headers={"User-Agent": "HydroPosterRiverNames/1.0 (offline dataset build)"},
            )
            with urllib.request.urlopen(request, timeout=120) as response:
                results = json.load(response)
            for result in results:
                name = canonical_name(result.get("display_name"))
                geometry = result.get("geojson", {})
                if name != target or geometry.get("type") not in ("LineString", "MultiLineString"):
                    continue
                for coordinates in lines(geometry):
                    fingerprint = hashlib.sha256(json.dumps(coordinates, separators=(",", ":")).encode()).hexdigest()
                    if fingerprint in seen_lines:
                        continue
                    seen_lines.add(fingerprint)
                    named.append({
                        "type": "Feature",
                        "geometry": {"type": "LineString", "coordinates": coordinates},
                        "properties": {
                            "name": target,
                            "source_name": result.get("display_name", "").split(",", 1)[0],
                            "osm_type": result.get("osm_type"),
                            "osm_id": result.get("osm_id"),
                            "name_status": "matched",
                        },
                    })
            time.sleep(1.05)

    ids = sorted(set(UNNAMED_REACH_EVIDENCE.values()))
    request = urllib.request.Request(
        "https://api.openstreetmap.org/api/0.6/ways.json?ways=" + ",".join(map(str, ids)),
        headers={"User-Agent": "HydroPosterRiverNames/1.0 (offline dataset build)"},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        elements = json.load(response).get("elements", [])
    verified = {element["id"] for element in elements if element.get("type") == "way"
                and element.get("tags", {}).get("waterway") in ("river", "stream")
                and not element.get("tags", {}).get("name")}
    unnamed.extend({"osm_type": "way", "osm_id": osm_id, "verified_unnamed": osm_id in verified}
                   for osm_id in ids)
    return {
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "source": "OpenStreetMap contributors",
        "license": "ODbL 1.0",
        "query_scope": "Eight named Guyana river systems plus a bounded unnamed-waterway sample",
        "named_features": named,
        "unnamed_evidence": unnamed,
    }


def hydro_clip(api_base: str, geography_id: str) -> dict[str, Any]:
    body = json.dumps({
        "geography_id": geography_id,
        "density_preset": "balanced",
        "classification_preset": "standard",
    }).encode()
    return request_json(f"{api_base.rstrip('/')}/clip", data=body)


def build_index(snapshot: dict[str, Any], hydro: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    cell_size = MATCH_RADIUS_M
    named_grid: dict[tuple[int, int], list[tuple[float, float, str, str, int]]] = defaultdict(list)
    target_source_counts: Counter[str] = Counter()
    for feature in snapshot["named_features"]:
        props = feature["properties"]
        name = props["name"]
        target_source_counts[name] += 1
        points = [mercator(*coordinate) for coordinate in feature["geometry"]["coordinates"]]
        source_ref = f"{props['osm_type']}/{props['osm_id']}"
        for x, y in densify(points):
            named_grid[(math.floor(x / cell_size), math.floor(y / cell_size))].append((x, y, name, source_ref, props["osm_id"]))

    index: dict[str, dict[str, Any]] = {}
    distances_by_name: dict[str, list[float]] = defaultdict(list)

    for feature in hydro.get("features", []):
        props = feature.get("properties", {})
        reach_id = str(props.get("hydrorivers_id", ""))
        samples: list[tuple[float, float]] = []
        for line in lines(feature.get("geometry", {})):
            samples.extend(densify([(float(x), float(y)) for x, y, *_ in line]))
        if not reach_id or not samples:
            continue

        votes: list[tuple[str, float, str, int]] = []
        for x, y in samples:
            gx, gy = math.floor(x / cell_size), math.floor(y / cell_size)
            candidates = [candidate for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                          for candidate in named_grid.get((gx + dx, gy + dy), [])]
            if not candidates:
                continue
            nearest = min(candidates, key=lambda candidate: (candidate[0] - x) ** 2 + (candidate[1] - y) ** 2)
            distance = math.hypot(nearest[0] - x, nearest[1] - y)
            if distance <= MATCH_RADIUS_M:
                votes.append((nearest[2], distance, nearest[3], nearest[4]))

        if votes:
            counts = Counter(vote[0] for vote in votes)
            name, count = counts.most_common(1)[0]
            dominant = [vote for vote in votes if vote[0] == name]
            coverage = count / len(samples)
            dominance = count / len(votes)
            median_distance = statistics.median(vote[1] for vote in dominant)
            status = "matched" if coverage >= MATCHED_COVERAGE and dominance >= 0.75 else "ambiguous"
            if coverage < AMBIGUOUS_COVERAGE:
                status = "not_evaluated"
            if status != "not_evaluated":
                confidence = max(0.0, min(1.0, coverage * dominance * (1 - median_distance / (MATCH_RADIUS_M * 2))))
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
                continue

    verified_unnamed = {item["osm_id"] for item in snapshot["unnamed_evidence"] if item["verified_unnamed"]}
    for reach_id, osm_id in UNNAMED_REACH_EVIDENCE.items():
        if osm_id in verified_unnamed and reach_id not in index:
            index[reach_id] = {
                "name_status": "unnamed_in_source",
                "name": None,
                "confidence": 0.7,
                "source_refs": [f"way/{osm_id}"],
            }

    matched_counts = Counter(value.get("name") for value in index.values() if value["name_status"] == "matched")
    per_target = {}
    for target in TARGETS:
        distances = sorted(distances_by_name[target])
        per_target[target] = {
            "source_feature_count": target_source_counts[target],
            "matched_reach_count": matched_counts[target],
            "median_distance_m": round(statistics.median(distances), 1) if distances else None,
            "p95_distance_m": round(distances[min(len(distances) - 1, math.floor(len(distances) * 0.95))], 1) if distances else None,
        }
    evaluation = {
        "schema_version": 1,
        "status": "passed" if all(item["source_feature_count"] and item["matched_reach_count"] for item in per_target.values()) else "warning",
        "targets": per_target,
        "counts": dict(Counter(value["name_status"] for value in index.values())),
        "limitations": [
            "This is source-to-source agreement, not surveyed ground truth.",
            "Completeness varies with OSM coverage, language, river segmentation and local naming practice.",
            "A name is shown only when the pilot matcher reaches its threshold; ambiguous results abstain.",
        ],
    }
    return index, evaluation


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-base", default="https://hydro-backend-54n4ik523a-uc.a.run.app")
    parser.add_argument("--geography-id", default="3d43dc73-e0ba-4abf-ab0b-b73729f66a70")
    parser.add_argument("--nominatim", default="https://nominatim.openstreetmap.org/search")
    parser.add_argument("--output", type=Path, default=Path("backend/app/data/river_names/guyana"))
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    snapshot = osm_snapshot(args.nominatim)
    hydro = hydro_clip(args.api_base, args.geography_id)
    name_index, evaluation = build_index(snapshot, hydro)
    artifact = {
        "type": "FeatureCollection",
        "metadata": {
            "schema_version": "river-names-v1",
            "country": "Guyana",
            "country_code": "GY",
            "geography_id": args.geography_id,
            "source": "OpenStreetMap contributors",
            "source_license": "ODbL 1.0",
            "hydrorivers_source": "HydroRIVERS v1.0 (WWF)",
            "method": "offline spatial association with confidence-scored abstention",
            "disclaimer": "River-name completeness varies by country, language, OSM coverage, segmentation and local mapping practice.",
            "evaluated_systems": list(TARGETS),
        },
        "name_index": name_index,
        "features": snapshot["named_features"],
    }
    artifact_body = json.dumps(artifact, separators=(",", ":"), sort_keys=True).encode()
    version = hashlib.sha256(artifact_body).hexdigest()
    artifact_path = args.output / f"{version}.json"
    artifact_path.write_bytes(artifact_body)
    manifest = {
        "schema_version": 1,
        "country": "Guyana",
        "country_code": "GY",
        "geography_id": args.geography_id,
        "dataset_version": version,
        "generated_at": snapshot["captured_at"],
        "artifact": {
            "path": artifact_path.name,
            "sha256": version,
            "byte_size": len(artifact_body),
            "feature_count": len(artifact["features"]),
            "indexed_reach_count": len(name_index),
        },
        "evaluation": evaluation,
        "attribution": "© OpenStreetMap contributors; ODbL 1.0",
        "disclaimer": artifact["metadata"]["disclaimer"],
    }
    (args.output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (args.output / "evaluation.json").write_text(json.dumps(evaluation, indent=2), encoding="utf-8")
    source_record = {key: snapshot[key] for key in ("captured_at", "source", "license", "query_scope")}
    source_record["objects"] = [feature["properties"] for feature in snapshot["named_features"]]
    source_record["unnamed_evidence"] = snapshot["unnamed_evidence"]
    (args.output / "source-record.json").write_text(json.dumps(source_record, indent=2), encoding="utf-8")
    print(json.dumps({"manifest": manifest, "evaluation": evaluation}, indent=2))


if __name__ == "__main__":
    main()
