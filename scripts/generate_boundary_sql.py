"""
Generate SQL INSERT statement for a geoBoundaries GeoJSON file.
Outputs a .sql file that can be executed via the Supabase MCP.
"""
import json
import sys
from shapely.geometry import shape

def main():
    if len(sys.argv) < 4:
        print("Usage: python generate_boundary_sql.py <geojson_path> <admin_level> <region_code>")
        sys.exit(1)
    
    geojson_path = sys.argv[1]
    admin_level = int(sys.argv[2])
    region_code = sys.argv[3]
    
    with open(geojson_path, 'r') as f:
        data = json.load(f)
    
    sql_statements = []
    
    for feat in data['features']:
        props = feat.get('properties', {})
        name = props.get('shapeName', 'Unknown').replace("'", "''")
        country_code = props.get('shapeISO', 'UNK')[:3]
        country = props.get('shapeGroup', 'Unknown').replace("'", "''")
        
        geom = shape(feat['geometry'])
        
        # Ensure MultiPolygon
        if geom.geom_type == 'Polygon':
            from shapely.geometry import MultiPolygon
            geom = MultiPolygon([geom])
        
        if not geom.is_valid:
            geom = geom.buffer(0)
        
        wkt = geom.wkt
        
        sql = (
            f"INSERT INTO admin_boundaries "
            f"(name, country, country_code, admin_level, parent_id, region_code, source, source_version, geom) "
            f"VALUES ('{name}', '{country}', '{country_code}', {admin_level}, NULL, '{region_code}', "
            f"'geoBoundaries', '6.0', ST_GeomFromText('{wkt}', 4326)) "
            f"ON CONFLICT (name, admin_level, region_code) "
            f"DO UPDATE SET country = EXCLUDED.country, country_code = EXCLUDED.country_code, "
            f"geom = EXCLUDED.geom, updated_at = CURRENT_TIMESTAMP;"
        )
        sql_statements.append(sql)
    
    # Write combined SQL
    output_path = geojson_path.replace('.geojson', '.sql')
    with open(output_path, 'w') as f:
        f.write('\n'.join(sql_statements))
    
    print(f"Generated {len(sql_statements)} SQL statement(s)")
    print(f"Output: {output_path}")
    
    # Also print the SQL so it can be captured
    for s in sql_statements:
        print(f"SQL_LENGTH: {len(s)}")

if __name__ == "__main__":
    main()
