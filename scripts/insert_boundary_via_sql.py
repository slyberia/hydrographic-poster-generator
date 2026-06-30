"""
Insert boundary data into Supabase via the MCP execute_sql tool.
Generates a simplified WKT to stay within API limits,
and outputs the SQL for copy-paste into the MCP.
"""
import json
import sys
from shapely.geometry import shape, MultiPolygon
from shapely import wkt

def main():
    if len(sys.argv) < 4:
        print("Usage: python insert_boundary_via_sql.py <geojson_path> <admin_level> <region_code> [tolerance]")
        sys.exit(1)
    
    geojson_path = sys.argv[1]
    admin_level = int(sys.argv[2])
    region_code = sys.argv[3]
    tolerance = float(sys.argv[4]) if len(sys.argv) > 4 else 0.001  # ~100m simplification
    
    with open(geojson_path, 'r') as f:
        data = json.load(f)
    
    for feat in data['features']:
        props = feat.get('properties', {})
        name = props.get('shapeName', 'Unknown').replace("'", "''")
        country_code = props.get('shapeISO', 'UNK')[:3]
        country = props.get('shapeGroup', 'Unknown').replace("'", "''")
        
        geom = shape(feat['geometry'])
        
        # Ensure MultiPolygon
        if geom.geom_type == 'Polygon':
            geom = MultiPolygon([geom])
        
        if not geom.is_valid:
            geom = geom.buffer(0)
        
        # Simplify to reduce WKT size
        original_len = len(geom.wkt)
        simplified = geom.simplify(tolerance, preserve_topology=True)
        simplified_wkt = simplified.wkt
        
        print(f"Feature: {name}")
        print(f"Original WKT: {original_len} chars")
        print(f"Simplified WKT: {len(simplified_wkt)} chars (tolerance={tolerance})")
        print(f"Geometry type: {simplified.geom_type}")
        print(f"Is valid: {simplified.is_valid}")
        
        # Write the SQL
        sql = (
            f"INSERT INTO admin_boundaries "
            f"(name, country, country_code, admin_level, parent_id, region_code, source, source_version, geom) "
            f"VALUES ('{name}', '{country}', '{country_code}', {admin_level}, NULL, '{region_code}', "
            f"'geoBoundaries', '6.0', ST_SetSRID(ST_GeomFromText('{simplified_wkt}'), 4326)) "
            f"ON CONFLICT (name, admin_level, region_code) "
            f"DO UPDATE SET country = EXCLUDED.country, country_code = EXCLUDED.country_code, "
            f"geom = EXCLUDED.geom, updated_at = CURRENT_TIMESTAMP;"
        )
        
        output_path = geojson_path.replace('.geojson', '_simplified.sql')
        with open(output_path, 'w') as f:
            f.write(sql)
        
        print(f"SQL written to: {output_path}")
        print(f"Total SQL length: {len(sql)} chars")

if __name__ == "__main__":
    main()
