import argparse
import os
import sys
import time
import fiona
import psycopg2
from psycopg2.extras import execute_values
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
from shapely.prepared import prep
from dotenv import load_dotenv
from tqdm import tqdm
import json

# Load environment variables
load_dotenv()

# Field Mapping: Source (HydroRIVERS) -> Target (PostGIS schema)
# Update these if the actual shapefile fields differ slightly
FIELD_MAP = {
    "hydrorivers_id": "HYRIV_ID",
    "stream_order": "ORD_STRA",
    "upstream_area": "UP_AREA_SQKM",  # or UPLAND_SKM
    "length_km": "LENGTH_KM",
}

def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable is not set.")
        sys.exit(1)
    try:
        return psycopg2.connect(db_url)
    except Exception as e:
        print(f"Database connection failed: {e}")
        sys.exit(1)

def get_field_value(feature, field_name_options):
    """Try to get a value matching one of the field options in the source data."""
    properties = feature.get("properties", {})
    if isinstance(field_name_options, list):
        for opt in field_name_options:
            if opt in properties:
                return properties[opt]
        return None
    return properties.get(field_name_options)

def get_region_boundary_filter(region_code):
    # Import the REGIONS safely
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    try:
        from scripts.bulk_ingest_adm0 import REGIONS
    except ImportError:
        return None

    isos = REGIONS.get(region_code, [])
    if not isos:
        return None
    
    polygons = []
    for iso in isos:
        path = f"data/boundaries/geoBoundaries-{iso}-ADM0.geojson"
        if os.path.exists(path):
            with open(path, 'r') as f:
                data = json.load(f)
                for feature in data.get("features", []):
                    if feature.get("geometry"):
                        polygons.append(shape(feature["geometry"]))
    
    if not polygons:
        return None
        
    merged_poly = unary_union(polygons)
    return prep(merged_poly)

def main():
    parser = argparse.ArgumentParser(description="Import HydroRIVERS dataset into PostGIS.")
    parser.add_argument("source_path", help="Path to the source shapefile or .gdb")
    parser.add_argument("region_code", help="Region code (e.g., south_america)")
    parser.add_argument("--batch-size", type=int, default=1000, help="Insert batch size")
    args = parser.parse_args()

    if not os.path.exists(args.source_path):
        print(f"Error: Source file not found: {args.source_path}")
        sys.exit(1)

    print(f"Connecting to database...")
    conn = get_db_connection()
    cursor = conn.cursor()

    print(f"Building local spatial filter for {args.region_code}...")
    spatial_filter = get_region_boundary_filter(args.region_code)
    if not spatial_filter:
        print(f"Warning: No local boundaries found for {args.region_code}. Local filtering will be skipped.")
    else:
        print(f"Successfully built spatial filter for {args.region_code}.")

    start_time = time.time()
    features_read = 0
    features_imported = 0
    features_skipped = 0

    print(f"Opening source file: {args.source_path}")
    try:
        with fiona.open(args.source_path, "r") as source:
            total_features = len(source)
            print(f"Found {total_features} features. Starting import...")

            batch = []
            
            # Using tqdm for progress bar
            for feature in tqdm(source, total=total_features, desc="Importing"):
                features_read += 1
                
                geom_type = feature.get("geometry", {}).get("type")
                if geom_type not in ["LineString", "MultiLineString"]:
                    features_skipped += 1
                    continue

                # Ensure it's a MultiLineString for the database
                geom = shape(feature["geometry"])
                
                # Apply local spatial filter
                if spatial_filter and not spatial_filter.intersects(geom):
                    features_skipped += 1
                    continue
                if geom.geom_type == 'LineString':
                    # WKT representation for EWKT insertion
                    geom_wkt = f"SRID=4326;MULTILINESTRING(({', '.join([f'{c[0]} {c[1]}' for c in geom.coords])}))"
                elif geom.geom_type == 'MultiLineString':
                    geom_wkt = f"SRID=4326;{geom.wkt}"
                else:
                    features_skipped += 1
                    continue

                # Extract fields
                hr_id = get_field_value(feature, FIELD_MAP["hydrorivers_id"])
                
                if hr_id is None:
                    features_skipped += 1
                    continue

                s_order = get_field_value(feature, FIELD_MAP["stream_order"])
                up_area = get_field_value(feature, ["UP_AREA_SQKM", "UPLAND_SKM"])
                len_km = get_field_value(feature, FIELD_MAP["length_km"])

                record = (
                    args.region_code,
                    "hydrorivers",
                    "1.0",
                    hr_id,
                    s_order,
                    up_area,
                    len_km,
                    "unclassified", # Default display_class
                    geom_wkt
                )
                batch.append(record)

                if len(batch) >= args.batch_size:
                    insert_batch(cursor, batch)
                    conn.commit()
                    features_imported += len(batch)
                    batch = []

            # Insert remaining
            if batch:
                insert_batch(cursor, batch)
                conn.commit()
                features_imported += len(batch)

    except Exception as e:
        print(f"\nError during import: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

    duration = time.time() - start_time
    print("\n--- Import Summary ---")
    print(f"Region: {args.region_code}")
    print(f"Source: {args.source_path}")
    print(f"Features read: {features_read}")
    print(f"Features imported: {features_imported}")
    print(f"Features skipped/errored: {features_skipped}")
    print(f"Duration: {duration:.2f} seconds")

def insert_batch(cursor, batch):
    insert_query = """
        INSERT INTO hydro_rivers (
            region_code, source_dataset, source_version, hydrorivers_id,
            stream_order, upstream_area, length_km, display_class, geom
        ) VALUES %s
        ON CONFLICT (hydrorivers_id, region_code) 
        DO UPDATE SET
            stream_order = EXCLUDED.stream_order,
            upstream_area = EXCLUDED.upstream_area,
            length_km = EXCLUDED.length_km,
            geom = EXCLUDED.geom,
            updated_at = CURRENT_TIMESTAMP;
    """
    execute_values(cursor, insert_query, batch)

if __name__ == "__main__":
    main()
