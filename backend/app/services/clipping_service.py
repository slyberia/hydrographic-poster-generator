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

        # 2. Boundary lookup + frame extent. The bbox comes from the boundary
        # polygon (not the rivers) so the map frame is stable across density
        # presets. Scalar accessors avoid BOX2D parsing since this is one row.
        # (docs/PROJECTION_SCALEBAR_NOTES.md §3.1)
        boundary_query = """
            SELECT name, region_code,
                   ST_XMin(ST_Transform(geom, 3857)) AS bbox_min_x,
                   ST_YMin(ST_Transform(geom, 3857)) AS bbox_min_y,
                   ST_XMax(ST_Transform(geom, 3857)) AS bbox_max_x,
                   ST_YMax(ST_Transform(geom, 3857)) AS bbox_max_y
            FROM admin_boundaries
            WHERE id = $1;
        """

        # 3. Rivers clipped to the boundary, projected to Web Mercator so the
        # renderer works in flat Cartesian meters (contract §1).
        rivers_query = """
            WITH geo AS (
                SELECT geom FROM admin_boundaries WHERE id = $1
            )
            SELECT
                hr.hydrorivers_id,
                hr.stream_order,
                hr.upstream_area,
                hr.length_km,
                ST_AsGeoJSON(ST_Transform(ST_Intersection(hr.geom, geo.geom), 3857)) as geojson
            FROM hydro_rivers hr
            JOIN geo ON ST_Intersects(hr.geom, geo.geom)
            WHERE hr.stream_order >= $2
            ORDER BY hr.stream_order DESC;
        """

        features = []

        async with pool.acquire() as conn:
            boundary = await conn.fetchrow(boundary_query, geography_id)
            if boundary is None:
                raise ValueError(f"Geography '{geography_id}' not found")

            rows = await conn.fetch(rivers_query, geography_id, min_order)

            for row in rows:
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
            geography_name=boundary['name'],
            region_code=boundary['region_code'],
            river_count=len(features),
            classification_status="success",
            bbox_3857=[
                boundary['bbox_min_x'], boundary['bbox_min_y'],
                boundary['bbox_max_x'], boundary['bbox_max_y'],
            ],
        )

        return ClipResult(features=features, metadata=metadata)
