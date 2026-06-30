"""
Build a SQL INSERT using ST_GeomFromGeoJSON and write it to a file.
"""
import json

with open("data/boundaries/guyana_geom_simplified.json", "r") as f:
    geojson_str = f.read().strip()

# Escape single quotes for SQL
geojson_escaped = geojson_str.replace("'", "''")

sql = (
    "INSERT INTO admin_boundaries "
    "(name, country, country_code, admin_level, parent_id, region_code, source, source_version, geom) "
    f"VALUES ('Guyana', 'GUY', 'GUY', 0, NULL, 'south_america', "
    f"'geoBoundaries', '6.0', ST_SetSRID(ST_GeomFromGeoJSON('{geojson_escaped}'), 4326)) "
    "ON CONFLICT (name, admin_level, region_code) "
    "DO UPDATE SET country = EXCLUDED.country, country_code = EXCLUDED.country_code, "
    "geom = EXCLUDED.geom, updated_at = CURRENT_TIMESTAMP;"
)

with open("data/boundaries/guyana_geojson_insert.sql", "w") as f:
    f.write(sql)

print(f"SQL length: {len(sql)} chars")
print("Written to data/boundaries/guyana_geojson_insert.sql")
