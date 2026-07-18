#!/usr/bin/env python3
"""Drone zoning platform spatial data ingestion script.
Provides CLI modes for dry-run, staging, validating, promoting, and rolling back runs.
"""

import argparse
import asyncio
import hashlib
import json
import logging
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Set, Tuple, Optional
import asyncpg
import h3
import httpx
import osmiter
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Load local environment variables (.env files)
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / "backend" / ".env")

# 1.4 Semantic Mapping Registry
FEATURE_MAPPINGS = {
    "school": {
        "layer_key": "guynode_schools_r4",
        "subtype_key": "school",
        "osm_match": {
            "amenity": {"school", "college", "university"}
        },
        "allowed_geometry_types": {"Point", "Polygon", "MultiPolygon"},
        "default_confidence": "proxy_osm",
    },
    "hospital": {
        "layer_key": "osm_health_facilities",
        "subtype_key": "hospital",
        "osm_match": {
            "amenity": {"hospital", "clinic"}
        },
        "allowed_geometry_types": {"Point", "Polygon", "MultiPolygon"},
        "default_confidence": "proxy_osm",
    },
    "power": {
        "layer_key": "guynode_infrastructure",
        "subtype_key": "power",
        "osm_match": {
            "power": {"line", "substation", "generator"}
        },
        "allowed_geometry_types": {"Point", "LineString", "MultiLineString", "Polygon", "MultiPolygon"},
        "default_confidence": "proxy_osm",
    },
    "bridge": {
        "layer_key": "guynode_infrastructure",
        "subtype_key": "bridge",
        "osm_match": {
            "bridge": {"yes", "beam", "cantilever", "suspension"}
        },
        "allowed_geometry_types": {"LineString", "MultiLineString", "Polygon", "MultiPolygon"},
        "default_confidence": "proxy_osm",
    },
    "port": {
        "layer_key": "guynode_infrastructure",
        "subtype_key": "port",
        "match_any": [
            {"harbour": {"yes"}},
            {"industrial": {"port"}, "landuse": {"industrial"}}
        ],
        "allowed_geometry_types": {"Point", "Polygon", "MultiPolygon"},
        "default_confidence": "proxy_osm",
    },
    "pier": {
        "layer_key": "guynode_infrastructure",
        "subtype_key": "pier",
        "osm_match": {
            "man_made": {"pier"}
        },
        "allowed_geometry_types": {"LineString", "MultiLineString", "Polygon", "MultiPolygon"},
        "default_confidence": "proxy_osm",
    },
    "airport": {
        "layer_key": "guynode_airports",
        "subtype_key": "aerodrome_proximity",
        "osm_match": {
            "aeroway": {"aerodrome", "airport"}
        },
        "allowed_geometry_types": {"Point", "Polygon", "MultiPolygon"},
        "default_confidence": "proxy_osm",
    },
    "heliport": {
        "layer_key": "guynode_airports",
        "subtype_key": "heliport_proximity",
        "osm_match": {
            "aeroway": {"heliport", "helipad"}
        },
        "allowed_geometry_types": {"Point", "Polygon", "MultiPolygon"},
        "default_confidence": "proxy_osm",
    },
    "protected_area": {
        "layer_key": "guynode_protected_areas",
        "subtype_key": "protected_area",
        "osm_match": {
            "boundary": {"protected_area"}
        },
        "allowed_geometry_types": {"Polygon", "MultiPolygon"},
        "default_confidence": "proxy_osm",
    }
}

# 3.3 Manually Seeded Safety Aerodromes
MANUAL_FEATURES = [
    {
        "source_key": "manual:aerodrome:cjia",
        "layer_key": "guynode_airports",
        "subtype_key": "aerodrome_proximity",
        "name": "Cheddi Jagan International Airport",
        "attrs": {
            "icao": "SYCJ",
            "iata": "GEO",
            "type": "international_airport",
            "source": "Guyana Civil Aviation Authority (GCAA) / Manual Seeding"
        },
        "geom": {
            "type": "Point",
            "coordinates": [-58.2536, 6.4975]
        },
        "confidence": "verified_authoritative"
    },
    {
        "source_key": "manual:aerodrome:ogle",
        "layer_key": "guynode_airports",
        "subtype_key": "aerodrome_proximity",
        "name": "Eugene F. Correia International Airport",
        "attrs": {
            "icao": "SYEC",
            "iata": "OGL",
            "type": "regional_airport",
            "source": "Guyana Civil Aviation Authority (GCAA) / Manual Seeding"
        },
        "geom": {
            "type": "Point",
            "coordinates": [-58.1062, 6.8048]
        },
        "confidence": "verified_authoritative"
    },
    {
        "source_key": "manual:helipad:georgetown_public_hospital",
        "layer_key": "guynode_airports",
        "subtype_key": "heliport_proximity",
        "name": "Georgetown Public Hospital Helipad",
        "attrs": {
            "type": "helipad",
            "source": "Manual Seeding"
        },
        "geom": {
            "type": "Point",
            "coordinates": [-58.1408, 6.8128]
        },
        "confidence": "manually_seeded"
    }
]


def calculate_checksum(file_path: Path) -> str:
    """Calculate SHA256 checksum of a file."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()


async def get_db_connection() -> asyncpg.Connection:
    """Get connection using DATABASE_URL environment variable."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is missing.")
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    return conn


async def validate_taxonomy_registry(conn: asyncpg.Connection) -> Tuple[Dict[str, int], Dict[str, int]]:
    """Query active layers and subtypes in the database, verifying mapped elements exist."""
    logger.info("Validating semantic mapping registry against database schema...")
    
    layers_rows = await conn.fetch("SELECT layer_id, layer_key, is_active FROM mcda_layers")
    db_layers = {row["layer_key"]: (row["layer_id"], row["is_active"]) for row in layers_rows}
    
    subtypes_rows = await conn.fetch("SELECT subtype_id, subtype_key FROM mcda_subtypes")
    db_subtypes = {row["subtype_key"]: row["subtype_id"] for row in subtypes_rows}

    layer_id_map = {}
    subtype_id_map = {}

    errors = []
    for mapping_key, config in FEATURE_MAPPINGS.items():
        layer_key = config["layer_key"]
        subtype_key = config["subtype_key"]

        # Validate Layer
        if layer_key not in db_layers:
            errors.append(f"Mapped layer_key '{layer_key}' for '{mapping_key}' not found in database.")
        else:
            layer_id, is_active = db_layers[layer_key]
            if not is_active:
                errors.append(f"Mapped layer_key '{layer_key}' for '{mapping_key}' is inactive in database.")
            else:
                layer_id_map[layer_key] = layer_id

        # Validate Subtype
        if subtype_key not in db_subtypes:
            errors.append(f"Mapped subtype_key '{subtype_key}' for '{mapping_key}' not found in database.")
        else:
            subtype_id_map[subtype_key] = db_subtypes[subtype_key]

    if errors:
        for err in errors:
            logger.error(err)
        raise ValueError("Taxonomy validation failed. Ingestion registry does not match active DB records.")
    
    logger.info("Semantic mapping registry validation passed successfully.")
    return layer_id_map, subtype_id_map


def generate_h3_grid(geom: Dict[str, Any], resolution: int) -> Set[str]:
    """Generate resolution-n H3 cells covering a GeoJSON Polygon/MultiPolygon (centroid-contained)."""
    gtype = geom.get("type")
    cells = set()
    
    if gtype == "Polygon":
        outer = [(pt[1], pt[0]) for pt in geom["coordinates"][0]]
        holes = [[(pt[1], pt[0]) for pt in hole] for hole in geom["coordinates"][1:]]
        poly = h3.LatLngPoly(outer, *holes)
        cells.update(h3.polygon_to_cells(poly, resolution))
    elif gtype == "MultiPolygon":
        polys = []
        for poly_coords in geom["coordinates"]:
            outer = [(pt[1], pt[0]) for pt in poly_coords[0]]
            holes = [[(pt[1], pt[0]) for pt in hole] for hole in poly_coords[1:]]
            polys.append(h3.LatLngPoly(outer, *holes))
        multipoly = h3.LatLngMultiPoly(*polys)
        cells.update(h3.polygon_to_cells(multipoly, resolution))
    else:
        raise ValueError(f"Unsupported geometry type for H3 grid generation: {gtype}")
        
    return cells


def select_region_feature(data: Dict[str, Any], region_key: str, region_name: str) -> Dict[str, Any]:
    """Finds the Region 4 feature based on the configured key or name, raising error if ambiguous."""
    features = data.get("features", [])
    matching_regions = []
    
    for feat in features:
        props = feat.get("properties", {})
        name = props.get("name") or props.get("Region") or props.get("REGION")
        if name and str(name).strip().lower() in [region_key.lower(), region_name.lower(), "4"]:
            matching_regions.append(feat)

    if len(matching_regions) == 0:
        raise ValueError(f"Could not find matching region for key '{region_key}' or name '{region_name}'.")
    elif len(matching_regions) > 1:
        raise ValueError(f"Found multiple matching region features: {[f.get('properties', {}).get('name') for f in matching_regions]}")
        
    return matching_regions[0]


def build_overpass_query(bbox: Tuple[float, float, float, float]) -> str:
    """Build Overpass QL query string for required layers within a bounding box."""
    ymin, xmin, ymax, xmax = bbox
    bbox_str = f"{ymin},{xmin},{ymax},{xmax}"
    
    query = f"""[out:json][timeout:180];
(
  node["amenity"~"school|college|university"]({bbox_str});
  way["amenity"~"school|college|university"]({bbox_str});
  
  node["amenity"~"hospital|clinic"]({bbox_str});
  way["amenity"~"hospital|clinic"]({bbox_str});
  
  node["power"~"line|substation|generator"]({bbox_str});
  way["power"~"line|substation|generator"]({bbox_str});
  
  way["bridge"]({bbox_str});
  
  node["harbour"="yes"]({bbox_str});
  node["industrial"="port"]({bbox_str});
  way["harbour"="yes"]({bbox_str});
  way["industrial"="port"]({bbox_str});
);
out body geom;"""
    return query


async def fetch_overpass_features(query: str, cache_path: Path) -> List[Dict[str, Any]]:
    """Fetch elements from Overpass API with retry, timeout, and local file caching."""
    if cache_path.exists():
        logger.info(f"Using cached Overpass response from: {cache_path}")
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as exc:
            logger.warning(f"Failed to read cache file: {exc}. Querying network...")

    logger.info("Querying Overpass API interpret endpoint...")
    url = "https://overpass-api.de/api/interpreter"
    headers = {"User-Agent": "GuyanaDroneZoningPlatform/1.0 (kyleg@example.com)"}
    
    async with httpx.AsyncClient(timeout=180.0, headers=headers) as client:
        retries = 3
        backoff = 2.0
        for attempt in range(retries):
            try:
                resp = await client.post(url, data={"data": query})
                if resp.status_code == 200:
                    data = resp.json()
                    elements = data.get("elements", [])
                    # Cache the raw response elements
                    cache_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(cache_path, "w", encoding="utf-8") as f:
                        json.dump(elements, f, indent=2)
                    return elements
                elif resp.status_code == 429:
                    logger.warning(f"Overpass API returned 429 (Rate Limit). Retrying in {backoff}s...")
                else:
                    logger.warning(f"Overpass API returned status {resp.status_code}. Retrying in {backoff}s...")
            except Exception as exc:
                logger.warning(f"Overpass request attempt {attempt + 1} failed: {exc}. Retrying in {backoff}s...")
            
            await asyncio.sleep(backoff)
            backoff *= 2.0

        raise RuntimeError("Failed to fetch features from Overpass API after maximum retries.")


def normalize_tags(item: Dict[str, Any]) -> Dict[str, str]:
    """Helper to resolve tag vs tags formatting inconsistencies in OSM datasets."""
    raw = item.get("tags") or item.get("tag") or {}
    return {str(k): str(v) for k, v in raw.items()} if isinstance(raw, dict) else {}


def match_osm_element(elem: Dict[str, Any]) -> List[Tuple[str, Dict[str, Any]]]:
    """Check if OSM element tags match active registry taxonomies."""
    tags = normalize_tags(elem)
    if not tags:
        return []
    
    matches = []
    for mapping_key, config in FEATURE_MAPPINGS.items():
        # Check disjunctive match_any rules
        if "match_any" in config:
            is_match = False
            for group in config["match_any"]:
                group_match = True
                for key, possible_values in group.items():
                    val = tags.get(key)
                    if not val or val not in possible_values:
                        group_match = False
                        break
                if group_match:
                    is_match = True
                    break
            if is_match:
                matches.append((mapping_key, config))
        
        # Fallback to standard flat osm_match
        elif "osm_match" in config:
            osm_match = config["osm_match"]
            is_match = True
            for key, possible_values in osm_match.items():
                val = tags.get(key)
                if not val or val not in possible_values:
                    is_match = False
                    break
            if is_match:
                matches.append((mapping_key, config))
            
    return matches


def osm_element_to_geojson(elem: Dict[str, Any], config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Convert OSM element to GeoJSON geometry complying with target layers."""
    etype = elem.get("type")
    
    if etype == "node":
        return {
            "type": "Point",
            "coordinates": [elem["lon"], elem["lat"]]
        }
    elif etype == "way":
        geom_points = elem.get("geometry", [])
        if not geom_points:
            return None
        coords = [[pt["lon"], pt["lat"]] for pt in geom_points]
        
        is_closed = coords[0] == coords[-1]
        
        # Check if the layer expects Polygon/MultiPolygon
        allowed = config.get("allowed_geometry_types", set())
        wants_poly = any(gt in allowed for gt in ("Polygon", "MultiPolygon"))
        
        if is_closed and wants_poly:
            return {
                "type": "Polygon",
                "coordinates": [coords]
            }
        else:
            return {
                "type": "LineString",
                "coordinates": coords
            }
    return None


def parse_osm_pbf_file(pbf_path: Path, bbox: Tuple[float, float, float, float]) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    """Extract features matching registry taxonomies from local PBF file inside bbox."""
    logger.info(f"Locally parsing OSM PBF file: {pbf_path}...")
    ymin, xmin, ymax, xmax = bbox
    
    node_coords = {}
    matched_features = []
    
    diag = {
        "candidate_nodes_matched": 0,
        "candidate_ways_matched": 0,
        "ways_resolved": 0,
        "ways_dropped_unresolved_nodes": 0,
        "ways_dropped_invalid_geometry": 0,
        "node_refs_missing_at_way_time": 0
    }
    
    # Sequential scan through OSM binary protocol format
    for item in osmiter.iter_from_osm(pbf_path):
        itype = item["type"]
        if itype == "node":
            node_id = item["id"]
            lat = item["lat"]
            lon = item["lon"]
            node_coords[node_id] = (lat, lon)
            
            matches = match_osm_element(item)
            if matches:
                # Bbox spatial pre-filtering
                if ymin <= lat <= ymax and xmin <= lon <= xmax:
                    diag["candidate_nodes_matched"] += 1
                    for mapping_key, config in matches:
                        matched_features.append({
                            "type": "node",
                            "id": node_id,
                            "tag": normalize_tags(item),
                            "geometry": {"type": "Point", "coordinates": [lon, lat]},
                            "config": config
                        })
                        
        elif itype == "way":
            way_id = item["id"]
            matches = match_osm_element(item)
            if matches:
                diag["candidate_ways_matched"] += 1
                
                # Resolve way nodes coordinates
                coords = []
                valid = True
                missing_nodes_count = 0
                for nd_id in item.get("nd", []):
                    if nd_id in node_coords:
                        coords.append(node_coords[nd_id])
                    else:
                        valid = False
                        missing_nodes_count += 1
                
                if not valid:
                    diag["ways_dropped_unresolved_nodes"] += 1
                    diag["node_refs_missing_at_way_time"] += missing_nodes_count
                    continue
                
                if coords:
                    diag["ways_resolved"] += 1
                    lats = [c[0] for c in coords]
                    lons = [c[1] for c in coords]
                    way_ymin, way_xmin, way_ymax, way_xmax = min(lats), min(lons), max(lats), max(lons)
                    
                    # Bbox overlap pre-filtering
                    if not (way_ymax < ymin or way_ymin > ymax or way_xmax < xmin or way_xmin > xmax):
                        geojson_coords = [[c[1], c[0]] for c in coords]
                        
                        for mapping_key, config in matches:
                            is_closed = geojson_coords[0] == geojson_coords[-1]
                            allowed = config.get("allowed_geometry_types", set())
                            wants_poly = any(gt in allowed for gt in ("Polygon", "MultiPolygon"))
                            
                            if is_closed and wants_poly:
                                geom_type = "Polygon"
                                geom_val = [geojson_coords]
                            else:
                                geom_type = "LineString"
                                geom_val = geojson_coords
                                
                            matched_features.append({
                                "type": "way",
                                "id": way_id,
                                "tag": normalize_tags(item),
                                "geometry": {"type": geom_type, "coordinates": geom_val},
                                "config": config
                            })
                            
    logger.info(f"PBF parser completed. Matched {len(matched_features)} features.")
    return matched_features, diag


async def execute_dry_run(args: argparse.Namespace) -> int:
    """Execute preflight and dry-run without writing to the database."""
    logger.info("=== STARTING DRY RUN INGESTION PREFLIGHT ===")
    
    geojson_path = Path(args.region_geojson)
    if not geojson_path.exists():
        logger.error(f"GeoJSON boundary file not found: {geojson_path}")
        return 1
    
    checksum = calculate_checksum(geojson_path)
    logger.info(f"Source boundary checksum (SHA256): {checksum}")

    # 1. Connect to DB to validate taxonomy
    conn = None
    try:
        conn = await get_db_connection()
        await validate_taxonomy_registry(conn)
    except Exception as exc:
        logger.error(f"Taxonomy preflight validation failed: {exc}")
        return 2
    finally:
        if conn:
            await conn.close()

    # 2. Parse GeoJSON content
    try:
        with open(geojson_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        matched_feature = select_region_feature(data, args.region_key, args.region_name)
        geom = matched_feature.get("geometry", {})
        
        logger.info(f"Successfully matched region: {matched_feature.get('properties', {})}")
        
        # Calculate bounding box
        coords_list = []
        if geom["type"] == "Polygon":
            coords_list.extend(geom["coordinates"][0])
        elif geom["type"] == "MultiPolygon":
            for poly in geom["coordinates"]:
                coords_list.extend(poly[0])
                
        lons = [c[0] for c in coords_list]
        lats = [c[1] for c in coords_list]
        bbox = (min(lats), min(lons), max(lats), max(lons))
        logger.info(f"Calculated Bounding Box: {bbox}")

        # 3. Test H3 Grid generation
        cells = generate_h3_grid(geom, args.h3_resolution)
        logger.info(f"H3 Grid generated successfully. Resolution: {args.h3_resolution}. Cell count: {len(cells)}")
        
        # 4. Test feature sourcing
        if args.osm_pbf:
            pbf_path = Path(args.osm_pbf)
            if not pbf_path.exists():
                logger.error(f"OSM PBF file not found: {pbf_path}")
                return 1
            if not pbf_path.is_file():
                logger.error(f"Expected a PBF file, found non-file path: {pbf_path}")
                return 1
            features, pbf_diag = parse_osm_pbf_file(pbf_path, bbox)
            logger.info(f"Dry-run PBF scan matched {len(features)} elements.")
            logger.info(f"Parser Accounting Diagnostics: {json.dumps(pbf_diag, indent=2)}")
        else:
            query = build_overpass_query(bbox)
            cache_path = Path(__file__).resolve().parent / "overpass_cache.json"
            elements = await fetch_overpass_features(query, cache_path)
            logger.info(f"Retrieved {len(elements)} raw elements from Overpass.")
            
            matched_count = 0
            for elem in elements:
                matches = match_osm_element(elem)
                if matches:
                    matched_count += 1
            logger.info(f"Matched {matched_count} OSM elements to semantic registry.")
            
    except Exception as exc:
        logger.error(f"Failed to parse source GeoJSON or generate H3: {exc}")
        return 5

    logger.info("=== DRY RUN PREFLIGHT COMPLETED SUCCESSFULLY ===")
    return 0


async def rollback_run(run_id_str: str) -> int:
    """Reverts only records associated with the named ingestion run."""
    logger.info(f"Rolling back run ID: {run_id_str}...")
    try:
        run_uuid = uuid.UUID(run_id_str)
    except ValueError:
        logger.error(f"Invalid UUID string: {run_id_str}")
        return 1

    conn = await get_db_connection()
    async with conn.transaction():
        res_boundary = await conn.execute("DELETE FROM staging_region_boundary WHERE run_id = $1", run_uuid)
        res_grid = await conn.execute("DELETE FROM staging_grid WHERE run_id = $1", run_uuid)
        res_features = await conn.execute("DELETE FROM staging_features WHERE run_id = $1", run_uuid)
        res_run = await conn.execute("DELETE FROM mcda_ingestion_runs WHERE run_id = $1", run_uuid)
        
        logger.info(f"Rollback completed: boundary={res_boundary}, grid={res_grid}, features={res_features}, run={res_run}")
    
    await conn.close()
    return 0


async def execute_stage(args: argparse.Namespace) -> int:
    """Writes to staging tables within a transaction."""
    logger.info("=== STARTING STAGE OPERATION ===")
    run_id = uuid.uuid4()
    
    geojson_path = Path(args.region_geojson)
    if not geojson_path.exists():
        logger.error(f"GeoJSON boundary file not found: {geojson_path}")
        return 1
    checksum = calculate_checksum(geojson_path)
    
    conn = await get_db_connection()
    try:
        # 1. Validate taxonomy
        await validate_taxonomy_registry(conn)

        # 2. Parse GeoJSON
        with open(geojson_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        matched_feature = select_region_feature(data, args.region_key, args.region_name)
        geom = matched_feature.get("geometry", {})
        props = matched_feature.get("properties", {})

        # Calculate bounding box
        coords_list = []
        if geom["type"] == "Polygon":
            coords_list.extend(geom["coordinates"][0])
        elif geom["type"] == "MultiPolygon":
            for poly in geom["coordinates"]:
                coords_list.extend(poly[0])
        lons = [c[0] for c in coords_list]
        lats = [c[1] for c in coords_list]
        bbox = (min(lats), min(lons), max(lats), max(lons))

        # 3. Generate H3 Cells
        logger.info("Generating H3 resolution-9 cells...")
        cells = generate_h3_grid(geom, args.h3_resolution)
        logger.info(f"Generated {len(cells)} cells.")

        # 4. Source OSM features
        features_data = []
        pbf_diag = None
        if args.osm_pbf:
            pbf_path = Path(args.osm_pbf)
            if not pbf_path.exists():
                logger.error(f"OSM PBF file not found: {pbf_path}")
                return 1
            if not pbf_path.is_file():
                logger.error(f"Expected a PBF file, found non-file path: {pbf_path}")
                return 1
            matched_pbf_elements, pbf_diag = parse_osm_pbf_file(pbf_path, bbox)
            
            for item in matched_pbf_elements:
                source_key = f"osm:{item['type']}:{item['id']}"
                name = item.get("tag", {}).get("name")
                attrs = item.get("tag", {})
                confidence = item["config"].get("default_confidence", "proxy_osm")
                
                features_data.append((
                    run_id,
                    source_key,
                    item["config"]["layer_key"],
                    item["config"]["subtype_key"],
                    name,
                    json.dumps(attrs),
                    json.dumps(item["geometry"]),
                    confidence
                ))
        else:
            query = build_overpass_query(bbox)
            cache_path = Path(__file__).resolve().parent / "overpass_cache.json"
            osm_elements = await fetch_overpass_features(query, cache_path)
            logger.info(f"Retrieved {len(osm_elements)} OSM elements.")
            
            for elem in osm_elements:
                matches = match_osm_element(elem)
                for mapping_key, config in matches:
                    geom_geojson = osm_element_to_geojson(elem, config)
                    if not geom_geojson:
                        continue
                    
                    source_key = f"osm:{elem['type']}:{elem['id']}"
                    name = elem.get("tags", {}).get("name")
                    attrs = elem.get("tags", {})
                    confidence = config.get("default_confidence", "proxy_osm")
                    
                    features_data.append((
                        run_id,
                        source_key,
                        config["layer_key"],
                        config["subtype_key"],
                        name,
                        json.dumps(attrs),
                        json.dumps(geom_geojson),
                        confidence
                    ))

        async with conn.transaction():
            # Create run record
            await conn.execute(
                """
                INSERT INTO mcda_ingestion_runs (run_id, status, branch, commit_hash, source_hashes, config_params)
                VALUES ($1, 'staged', $2, $3, $4, $5)
                """,
                run_id,
                "drone-b3-osm-features",
                "92861daf8c2a00cf6db5ffa2ccb881a705027bd5",
                json.dumps({"region_boundary": checksum}),
                json.dumps({
                    "region_key": args.region_key,
                    "region_name": args.region_name,
                    "h3_resolution": args.h3_resolution
                })
            )
            
            # Record source provenance
            await conn.execute(
                """
                INSERT INTO mcda_source_provenance (run_id, source_type, source_name, source_path, checksum, crs)
                VALUES ($1, 'geojson', 'guyana-admin-regions-population.geojson', $2, $3, 'EPSG:4326')
                """,
                run_id,
                str(geojson_path.resolve()),
                checksum
            )

            # Insert boundary into staging_region_boundary
            logger.info("Staging region boundary...")
            await conn.execute(
                """
                INSERT INTO staging_region_boundary (run_id, region_key, region_name, geom, raw_properties, validation_status)
                VALUES ($1, $2, $3, ST_SetSRID(ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_GeomFromGeoJSON($4)), 3)), 4326), $5, 'validated')
                """,
                run_id,
                args.region_key,
                args.region_name,
                json.dumps(geom),
                json.dumps(props)
            )

            # Bulk insert H3 grid cells into staging_grid
            logger.info("Staging H3 grid cells...")
            grid_data = []
            for cell in cells:
                lat, lng = h3.cell_to_latlng(cell)
                boundary = h3.cell_to_boundary(cell)
                coords = [[pt[1], pt[0]] for pt in boundary]
                coords.append(coords[0])
                cell_geom = {"type": "Polygon", "coordinates": [coords]}
                
                grid_data.append((
                    run_id,
                    cell,
                    args.h3_resolution,
                    json.dumps(cell_geom),
                    lng,
                    lat
                ))

            await conn.executemany(
                """
                INSERT INTO staging_grid (run_id, h3_index, resolution, geom, centroid, validation_status)
                VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326), ST_SetSRID(ST_MakePoint($5, $6), 4326), 'validated')
                """,
                grid_data
            )

            # Add manually seeded features
            logger.info("Adding manually seeded features...")
            for f in MANUAL_FEATURES:
                features_data.append((
                    run_id,
                    f["source_key"],
                    f["layer_key"],
                    f["subtype_key"],
                    f["name"],
                    json.dumps(f["attrs"]),
                    json.dumps(f["geom"]),
                    f["confidence"]
                ))

            # Bulk insert features
            logger.info(f"Inserting {len(features_data)} total features into staging...")
            await conn.executemany(
                """
                INSERT INTO staging_features (run_id, source_key, layer_key, subtype_key, name, attrs, geom, confidence, validation_status)
                VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_GeomFromGeoJSON($7), 4326), $8, 'validated')
                """,
                features_data
            )

            # Run spatial intersection check to delete features outside the Region 4 MultiPolygon
            logger.info("Performing spatial intersection filter on staged features...")
            deleted_count_res = await conn.execute(
                """
                DELETE FROM staging_features sf
                USING staging_region_boundary srb
                WHERE sf.run_id = $1 AND srb.run_id = $1
                  AND sf.source_key NOT LIKE 'manual:%'
                  AND NOT ST_Intersects(sf.geom, srb.geom)
                """,
                run_id
            )
            logger.info(f"Spatial filtering removed features outside boundary: {deleted_count_res}")

            # Parse deleted features count
            deleted_count = 0
            if deleted_count_res.startswith("DELETE "):
                try:
                    deleted_count = int(deleted_count_res.split()[1])
                except Exception:
                    pass

            # Get final staged counts
            final_features_count = await conn.fetchval(
                "SELECT COUNT(*) FROM staging_features WHERE run_id = $1", run_id
            )

            # Update ingestion run status & row counts
            await conn.execute(
                """
                UPDATE mcda_ingestion_runs
                SET status = 'staged', row_counts = $2, completed_at = CURRENT_TIMESTAMP
                WHERE run_id = $1
                """,
                run_id,
                json.dumps({
                    "staging_region_boundary": 1,
                    "staging_grid": len(cells),
                    "staging_features": final_features_count
                })
            )
            
            logger.info(f"Ingestion run ID {run_id} staged successfully: 1 boundary, {len(cells)} cells, {final_features_count} spatial features.")

            # Print diagnostics accounting report
            if pbf_diag:
                # Review warning threshold check (1% way drop)
                candidate_ways = pbf_diag["candidate_ways_matched"]
                dropped_ways = pbf_diag["ways_dropped_unresolved_nodes"] + pbf_diag["ways_dropped_invalid_geometry"]
                
                unresolved_ratio = 0.0
                if candidate_ways > 0:
                    unresolved_ratio = dropped_ways / candidate_ways

                accounting_report = {
                    "run_type": "verification",
                    "candidate_nodes_matched": pbf_diag["candidate_nodes_matched"],
                    "candidate_ways_matched": pbf_diag["candidate_ways_matched"],
                    "ways_resolved": pbf_diag["ways_resolved"],
                    "ways_dropped_unresolved_nodes": pbf_diag["ways_dropped_unresolved_nodes"],
                    "ways_dropped_invalid_geometry": pbf_diag["ways_dropped_invalid_geometry"],
                    "node_refs_missing_at_way_time": pbf_diag["node_refs_missing_at_way_time"],
                    "features_removed_outside_region": deleted_count,
                    "features_staged": final_features_count
                }
                
                logger.info(f"Parser Accounting Diagnostics Report:\n{json.dumps(accounting_report, indent=2)}")
                
                if unresolved_ratio > 0.01:
                    logger.warning(
                        f"WARNING: Unresolved/invalid ways ratio ({unresolved_ratio:.2%}) exceeds 1% threshold! "
                        "Sign-off in verification log required."
                    )
            
    except Exception as exc:
        logger.error(f"Failed to stage ingestion run: {exc}")
        return 6
    finally:
        await conn.close()
        
    return 0


async def execute_promote(args: argparse.Namespace) -> int:
    run_id = args.run_id
    region_key = args.region_key
    
    logger.info(f"=== STARTING PROMOTION FOR RUN ID {run_id} ===")
    
    try:
        conn = await get_db_connection()
    except Exception as exc:
        logger.error(f"Failed to connect to database: {exc}")
        return 1
        
    try:
        async with conn.transaction():
            # 1. Assert the run exists in staging, status is verified/staged, and not already promoted
            run = await conn.fetchrow(
                "SELECT run_id, status FROM mcda_ingestion_runs WHERE run_id = $1::uuid", run_id
            )
            if not run:
                logger.error(f"Ingestion run {run_id} not found in mcda_ingestion_runs.")
                return 2
                
            if run["status"] == "promoted":
                logger.error(f"Run {run_id} is already promoted.")
                return 3
                
            if run["status"] != "staged":
                logger.error(f"Run {run_id} is in status '{run['status']}', expected 'staged' for promotion.")
                return 4
                
            # 2. Upsert region boundary
            logger.info("Upserting region boundary...")
            region_id = await conn.fetchval(
                """
                INSERT INTO mcda_region_boundary (region_key, region_name, geom)
                SELECT region_key, region_name, geom
                FROM staging_region_boundary WHERE run_id = $1::uuid
                ON CONFLICT (region_key) DO UPDATE
                  SET geom = EXCLUDED.geom, region_name = EXCLUDED.region_name
                RETURNING region_id;
                """,
                run_id
            )
            logger.info(f"Resolved region_id = {region_id}")
            
            # 3. Clear canonical features/grid cells for this region (Option A: scoped delete)
            logger.info(f"Clearing canonical features and grid cells for region_id {region_id}...")
            # Delete dependent cell results first to avoid FK constraint violations
            deleted_results_res = await conn.execute(
                """
                DELETE FROM mcda_cell_results cr
                USING mcda_grid g
                WHERE cr.h3_index = g.h3_index AND g.region_id = $1
                """,
                region_id
            )
            logger.info(f"Deleted old cell results: {deleted_results_res}")

            # Delete features intersecting target region boundary
            deleted_features_res = await conn.execute(
                """
                DELETE FROM mcda_features f
                USING mcda_region_boundary r
                WHERE r.region_id = $1 AND ST_Intersects(f.geom, r.geom)
                """,
                region_id
            )
            logger.info(f"Deleted old features intersecting region boundary: {deleted_features_res}")
            
            # Delete old grid cells for this region
            deleted_grid_res = await conn.execute(
                "DELETE FROM mcda_grid WHERE region_id = $1",
                region_id
            )
            logger.info(f"Deleted old grid cells: {deleted_grid_res}")
            
            # 4. Promote H3 grid cells
            logger.info("Promoting grid cells...")
            promoted_grid_res = await conn.execute(
                """
                INSERT INTO mcda_grid (h3_index, resolution, region_id, geom, centroid)
                SELECT sg.h3_index, sg.resolution, $2, sg.geom, sg.centroid
                FROM staging_grid sg WHERE sg.run_id = $1::uuid
                ON CONFLICT (h3_index) DO UPDATE
                  SET region_id = EXCLUDED.region_id;
                """,
                run_id, region_id
            )
            grid_promoted = 0
            if promoted_grid_res.startswith("INSERT "):
                grid_promoted = int(promoted_grid_res.split()[2])
            
            # 5. Promote features
            logger.info("Promoting spatial features...")
            promoted_features_res = await conn.execute(
                """
                INSERT INTO mcda_features (layer_id, subtype_key, name, attrs, geom)
                SELECT l.layer_id, sf.subtype_key, sf.name, sf.attrs, sf.geom
                FROM staging_features sf
                JOIN mcda_layers l ON l.layer_key = sf.layer_key
                WHERE sf.run_id = $1::uuid;
                """,
                run_id
            )
            features_promoted = 0
            if promoted_features_res.startswith("INSERT "):
                features_promoted = int(promoted_features_res.split()[2])
                
            # 6. Perform Attrition Checks
            # Fetch staging counts
            staged_features = await conn.fetchval(
                "SELECT COUNT(*) FROM staging_features WHERE run_id = $1::uuid", run_id
            )
            staged_grid = await conn.fetchval(
                "SELECT COUNT(*) FROM staging_grid WHERE run_id = $1::uuid", run_id
            )
            
            logger.info(f"Staged features count: {staged_features}, Promoted: {features_promoted}")
            logger.info(f"Staged grid cell count: {staged_grid}, Promoted: {grid_promoted}")
            
            # Attrition mismatch check for features
            orphan_layer_keys = []
            if staged_features != features_promoted:
                # Find orphan layer keys
                orphans = await conn.fetch(
                    """
                    SELECT DISTINCT sf.layer_key
                    FROM staging_features sf
                    LEFT JOIN mcda_layers l ON l.layer_key = sf.layer_key
                    WHERE sf.run_id = $1::uuid AND l.layer_id IS NULL
                    """,
                    run_id
                )
                orphan_layer_keys = [r["layer_key"] for r in orphans]
                
                logger.error(
                    f"ERROR: Silent feature attrition detected! Staged: {staged_features}, Promoted: {features_promoted}. "
                    f"Orphan layer_keys: {orphan_layer_keys}"
                )
                raise ValueError("Silent feature attrition detected on promotion")
                
            # Attrition mismatch check for grid
            if staged_grid != grid_promoted:
                logger.error(
                    f"ERROR: Silent grid attrition detected! Staged: {staged_grid}, Promoted: {grid_promoted}."
                )
                raise ValueError("Silent grid attrition detected on promotion")
                
            # 7. Mark run as promoted in metadata
            await conn.execute(
                """
                UPDATE mcda_ingestion_runs
                SET status = 'promoted'
                WHERE run_id = $1::uuid
                """,
                run_id
            )
            
            # Print promotion report
            report = {
                "run_id": str(run_id),
                "boundary_upserted": True,
                "grid_staged": staged_grid,
                "grid_promoted": grid_promoted,
                "features_staged": staged_features,
                "features_promoted": features_promoted,
                "orphan_layer_keys": orphan_layer_keys
            }
            logger.info(f"Promotion Report:\n{json.dumps(report, indent=2)}")
            
    except Exception as exc:
        logger.error(f"Promotion failed and was rolled back: {exc}")
        return 5
    finally:
        await conn.close()
        
    logger.info("=== PROMOTION COMPLETED SUCCESSFULLY ===")
    return 0


async def main() -> int:
    parser = argparse.ArgumentParser(description="Drone Spatial Data Ingestion Script.")
    parser.add_argument("--region-geojson", help="Path to administrative region GeoJSON file.")
    parser.add_argument("--region-key", required=True, help="Region key id (e.g. guyana_region_4).")
    parser.add_argument("--region-name", help="Region name (e.g. Demerara-Mahaica).")
    parser.add_argument("--h3-resolution", type=int, default=9, help="H3 grid resolution.")
    parser.add_argument("--osm-pbf", help="Path to local OpenStreetMap PBF file.")
    parser.add_argument("--run-id", help="UUID of staged run to promote.")
    
    # CLI modes
    parser.add_argument("--dry-run", action="store_true", help="Perform preflight checks without writes.")
    parser.add_argument("--stage", action="store_true", help="Stage records into staging schema.")
    parser.add_argument("--validate", action="store_true", help="Validate staged records.")
    parser.add_argument("--promote", action="store_true", help="Promote staged records to canonical tables (Requires HITL approval).")
    parser.add_argument("--rollback-run", help="UUID of run to rollback.")

    args = parser.parse_args()

    if args.rollback_run:
        return await rollback_run(args.rollback_run)

    if args.dry_run or args.stage:
        if not args.region_geojson:
            logger.error("Error: --region-geojson is required for staging/dry-run.")
            return 1
        if not args.region_name:
            logger.error("Error: --region-name is required for staging/dry-run.")
            return 1

    if args.dry_run:
        return await execute_dry_run(args)
    
    if args.stage:
        return await execute_stage(args)

    if args.promote:
        if not args.run_id:
            logger.error("Error: --run-id <UUID> is required for promotion.")
            return 1
        if args.stage:
            logger.error("Error: Cannot combine --stage and --promote in a single run. Target a previously verified run id.")
            return 1
        return await execute_promote(args)

    logger.warning("No action specified. Run with --dry-run or --stage.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
