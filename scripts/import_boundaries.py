import argparse
import os
import sys
import time
import fiona
import psycopg2
from psycopg2.extras import execute_values
from shapely.geometry import shape
from dotenv import load_dotenv
from tqdm import tqdm

# Load environment variables
load_dotenv()

# Field Mapping: Source (geoBoundaries) -> Target (PostGIS schema)
FIELD_MAP = {
    "name": "shapeName",
    "country_code": "shapeISO",
    "country": "shapeGroup"
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

def get_field_value(feature, field_name):
    properties = feature.get("properties", {})
    return properties.get(field_name)

def find_parent_id(cursor, admin_level, country_code, region_code, name=None):
    """
    Attempt to find the parent_id based on the current admin level.
    ADM1 -> parent is ADM0 (matching country_code)
    ADM2 -> parent is ADM1 (matching country_code, and ideally we'd match ADM1 name, 
            but geoBoundaries ADM2 doesn't always contain ADM1 name reliably, 
            so this MVP links ADM2 to ADM0 as a fallback, or requires custom logic).
    """
    if admin_level == 0:
        return None
    
    # For MVP: If ADM1 or ADM2, link to ADM0 (Country)
    # Full hierarchical linkage requires more advanced spatial joins or exact name matching.
    cursor.execute("""
        SELECT id FROM admin_boundaries 
        WHERE admin_level = 0 AND country_code = %s AND region_code = %s
        LIMIT 1
    """, (country_code, region_code))
    
    result = cursor.fetchone()
    return result[0] if result else None

def main():
    parser = argparse.ArgumentParser(description="Import administrative boundary dataset into PostGIS.")
    parser.add_argument("source_path", help="Path to the source shapefile or GeoJSON")
    parser.add_argument("admin_level", type=int, choices=[0, 1, 2], help="Admin level (0=Country, 1=State/Prov, 2=County/Dist)")
    parser.add_argument("region_code", help="Region code (e.g., south_america)")
    parser.add_argument("--source-name", default="geoBoundaries", help="Source dataset name")
    parser.add_argument("--source-version", default="6.0", help="Source dataset version")
    parser.add_argument("--batch-size", type=int, default=500, help="Insert batch size")
    args = parser.parse_args()

    if not os.path.exists(args.source_path):
        print(f"Error: Source file not found: {args.source_path}")
        sys.exit(1)

    print(f"Connecting to database...")
    conn = get_db_connection()
    cursor = conn.cursor()

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
            
            for feature in tqdm(source, total=total_features, desc="Importing"):
                features_read += 1
                
                geom_type = feature.get("geometry", {}).get("type")
                if geom_type not in ["Polygon", "MultiPolygon"]:
                    features_skipped += 1
                    continue

                # Ensure it's a MultiPolygon for the database
                geom = shape(feature["geometry"])
                if geom.geom_type == 'Polygon':
                    geom_wkt = f"SRID=4326;MULTIPOLYGON({geom.wkt.replace('POLYGON ', '')})"
                elif geom.geom_type == 'MultiPolygon':
                    geom_wkt = f"SRID=4326;{geom.wkt}"
                else:
                    features_skipped += 1
                    continue

                # Extract fields
                name = get_field_value(feature, FIELD_MAP["name"])
                country_code = get_field_value(feature, FIELD_MAP["country_code"])
                country = get_field_value(feature, FIELD_MAP["country"])
                
                if not name or not country_code:
                    features_skipped += 1
                    continue

                parent_id = find_parent_id(cursor, args.admin_level, country_code, args.region_code)

                record = (
                    name,
                    country,
                    country_code[:3], # Ensure it fits VARCHAR(3)
                    args.admin_level,
                    parent_id,
                    args.region_code,
                    args.source_name,
                    args.source_version,
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
    print(f"Admin Level: {args.admin_level}")
    print(f"Source: {args.source_path}")
    print(f"Features read: {features_read}")
    print(f"Features imported: {features_imported}")
    print(f"Features skipped/errored: {features_skipped}")
    print(f"Duration: {duration:.2f} seconds")

def insert_batch(cursor, batch):
    insert_query = """
        INSERT INTO admin_boundaries (
            name, country, country_code, admin_level, parent_id,
            region_code, source, source_version, geom
        ) VALUES %s
        ON CONFLICT (name, admin_level, region_code) 
        DO UPDATE SET
            country = EXCLUDED.country,
            country_code = EXCLUDED.country_code,
            parent_id = EXCLUDED.parent_id,
            geom = EXCLUDED.geom,
            updated_at = CURRENT_TIMESTAMP;
    """
    execute_values(cursor, insert_query, batch)

if __name__ == "__main__":
    main()
