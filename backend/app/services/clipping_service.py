import asyncpg
import json
from app.models.clip_models import ClipResult, ClipMetadata
from app.services.rules_service import rules_service
from app.models.clip_models import ClipRequest, ClipResult, ClipMetadata

class ClippingService:
    @staticmethod
    async def clip_rivers(
        pool: asyncpg.Pool,
        geography_id: str,
        density_preset_id: str,
        classification_preset_id: str # We may use this later, currently density controls it per the spec
    ) -> ClipResult:

        # 1. Resolve presets
        density = rules_service.get_density_preset(density_preset_id)
        min_order = density.min_stream_order
        class_map = density.classification_map

        # 2. Boundary lookup + frame extent. The bbox comes from the boundary
        # polygon (not the rivers) so the map frame is stable across density
        # presets. Scalar accessors avoid BOX2D parsing since this is one row.
        # (docs/PROJECTION_SCALEBAR_NOTES.md §3.1)
        boundary_query = """
            SELECT name, region_code,
                   ST_XMin(ST_Transform(geom, 3857)) AS bbox_min_x,
                   ST_YMin(ST_Transform(geom, 3857)) AS bbox_min_y,
                   ST_XMax(ST_Transform(geom, 3857)) AS bbox_max_x,
                   ST_YMax(ST_Transform(geom, 3857)) AS bbox_max_y,
                   ST_XMin(geom) AS bbox4326_min_x,
                   ST_YMin(geom) AS bbox4326_min_y,
                   ST_XMax(geom) AS bbox4326_max_x,
                   ST_YMax(geom) AS bbox4326_max_y
            FROM admin_boundaries
            WHERE id = $1;
        """

        # 3. Rivers clipped to the boundary, projected to Web Mercator so the
        # renderer works in flat Cartesian meters (contract §1).
        rivers_query = """
            SELECT 
                hr.hydrorivers_id,
                hr.stream_order,
                hr.upstream_area,
                hr.length_km,
                hr.display_class,
                hr.geom_repaired,
                ST_AsGeoJSON(ST_Transform(ST_MakeValid(ST_Intersection(ST_MakeValid(hr.geom), geo.geom)), 3857)) as geojson
            FROM hydro_rivers hr
            JOIN (SELECT geom FROM admin_boundaries WHERE id = $1) geo
            ON ST_Intersects(hr.geom, geo.geom)
            WHERE hr.stream_order >= $2
            ORDER BY hr.stream_order DESC;
        """

        features = []
        repaired_count = 0

        async with pool.acquire() as conn:
            boundary = await conn.fetchrow(boundary_query, geography_id)
            if boundary is None:
                raise ValueError(f"Geography '{geography_id}' not found")

            rows = await conn.fetch(rivers_query, geography_id, min_order)

            for row in rows:
                geojson_str = row['geojson']
                if not geojson_str:
                    continue

                if row.get('geom_repaired'):
                    repaired_count += 1

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
                        "display_class": display_class,
                        "geom_repaired": bool(row.get('geom_repaired'))
                    }
                }
                features.append(feature)

        total_features = len(features)
        confidence_level = "standard"
        warnings = []
        if total_features > 0:
            repaired_ratio = repaired_count / total_features
            if repaired_ratio > 0.05:
                confidence_level = "low"
                warnings.append(f"High number of repaired geometries ({repaired_ratio:.1%} > 5%)")

        # Calculate distortion based on latitude spread (Mercator distortion = 1 / cos(lat))
        import math
        min_lat = boundary['bbox4326_min_y']
        max_lat = boundary['bbox4326_max_y']
        
        # Avoid math domain errors at poles
        min_lat_rad = math.radians(max(-89.9, min(89.9, min_lat)))
        max_lat_rad = math.radians(max(-89.9, min(89.9, max_lat)))
        
        scale_min = 1 / math.cos(min_lat_rad)
        scale_max = 1 / math.cos(max_lat_rad)
        distortion_spread = max(scale_min, scale_max) / min(scale_min, scale_max)
        
        scale_bar_valid = True
        distortion_warning = None
        if distortion_spread > 1.20:
            scale_bar_valid = False
            distortion_warning = f"High Mercator distortion (spread {distortion_spread:.2f}x > 1.20). Scale bar hidden."
            warnings.append(distortion_warning)

        metadata = ClipMetadata(
            geography_name=boundary['name'],
            region_code=boundary['region_code'],
            river_count=total_features,
            classification_status="success",
            bbox_3857=[
                boundary['bbox_min_x'], boundary['bbox_min_y'],
                boundary['bbox_max_x'], boundary['bbox_max_y'],
            ],
            bbox_4326=[
                boundary['bbox4326_min_x'], boundary['bbox4326_min_y'],
                boundary['bbox4326_max_x'], boundary['bbox4326_max_y'],
            ],
            repaired_geometry_count=repaired_count,
            confidence_level=confidence_level,
            confidence_warnings=warnings,
            scale_bar_valid=scale_bar_valid,
            distortion_warning=distortion_warning
        )

        return ClipResult(features=features, metadata=metadata)
