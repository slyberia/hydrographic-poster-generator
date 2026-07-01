import asyncpg
import json
from app.models.clip_models import ClipResult, ClipMetadata
from app.services.presets_service import get_density_preset

class ClippingService:
    @staticmethod
    async def clip_rivers(
        pool: asyncpg.Pool,
        geography_id: str,
        density_preset_id: str,
        classification_preset_id: str # We may use this later, currently density controls it per the spec
    ) -> ClipResult:
        
        # 1. Get preset config
        density_preset = get_density_preset(density_preset_id)
        min_order = density_preset.min_stream_order
        class_map = density_preset.classification_map

        # 2. Execute spatial query
        query = """
            WITH geo AS (
                SELECT name, region_code, geom 
                FROM admin_boundaries 
                WHERE id = $1
            )
            SELECT 
                hr.hydrorivers_id,
                hr.stream_order,
                hr.upstream_area,
                hr.length_km,
                geo.name as geography_name,
                geo.region_code,
                ST_AsGeoJSON(ST_Intersection(hr.geom, geo.geom)) as geojson
            FROM hydro_rivers hr
            JOIN geo ON ST_Intersects(hr.geom, geo.geom)
            WHERE hr.stream_order >= $2
            ORDER BY hr.stream_order DESC;
        """
        
        features = []
        geography_name = "Unknown"
        region_code = "unknown"
        
        async with pool.acquire() as conn:
            rows = await conn.fetch(query, geography_id, min_order)
            
            for row in rows:
                if geography_name == "Unknown":
                    geography_name = row['geography_name']
                    region_code = row['region_code']
                    
                geojson_str = row['geojson']
                if not geojson_str:
                    continue
                    
                # PostgreSQL ST_AsGeoJSON returns a string of the geometry object
                geometry = json.loads(geojson_str)
                
                # If intersection resulted in something other than LineString/MultiLineString, we can handle or skip
                # (e.g. ST_Intersection can sometimes return Points if boundaries just touch)
                if 'LineString' not in geometry['type']:
                    continue
                    
                stream_order = row['stream_order']
                display_class = class_map.get(stream_order, "minor")
                
                feature = {
                    "type": "Feature",
                    "geometry": geometry,
                    "properties": {
                        "hydrorivers_id": row['hydrorivers_id'],
                        "stream_order": stream_order,
                        "upstream_area": float(row['upstream_area']) if row['upstream_area'] else None,
                        "length_km": float(row['length_km']) if row['length_km'] else None,
                        "display_class": display_class
                    }
                }
                features.append(feature)
                
        metadata = ClipMetadata(
            geography_name=geography_name,
            region_code=region_code,
            river_count=len(features),
            classification_status="success"
        )
        
        return ClipResult(features=features, metadata=metadata)
