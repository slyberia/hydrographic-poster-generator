import json
import math
from app.models.clip_models import ClipResult, ClipMetadata
from app.services.rules_service import rules_service
from app.repository.river_repository import RiverRepository

class ClippingService:
    @staticmethod
    async def clip_rivers(
        repo: RiverRepository,
        geography_id: str,
        density_preset_id: str,
        classification_preset_id: str
    ) -> ClipResult:

        # 1. Resolve presets
        density = rules_service.get_density_preset(density_preset_id)
        min_order = density.min_stream_order
        class_map = density.classification_map

        # 2. Fetch boundary extent
        boundary = await repo.get_geography_boundary(geography_id)
        if not boundary:
            raise ValueError(f"Geography '{geography_id}' not found")

        # 3. Clip rivers
        rows = await repo.clip_rivers_to_geojson(geography_id, min_order)

        features = []
        repaired_count = 0

        for row in rows:
            geojson_str = row['geojson']
            if not geojson_str:
                continue

            geometry = json.loads(geojson_str)
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

        total_features = len(features)
        confidence_level = "standard"
        warnings = []
        if total_features > 0:
            repaired_ratio = repaired_count / total_features
            if repaired_ratio > 0.05:
                confidence_level = "low"
                warnings.append(f"High number of repaired geometries ({repaired_ratio:.1%} > 5%)")

        # 4. Mercator Distortion Check
        min_lat = boundary['bbox4326_min_y']
        max_lat = boundary['bbox4326_max_y']
        
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
