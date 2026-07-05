"""Single source of truth for EPSG:3857 → SVG coordinate mapping.

Normative source: docs/PROJECTION_SCALEBAR_NOTES.md §4. Every draw call
(rivers, legend anchor, scale bar, north arrow) must consume one instance
of this class; nothing else may derive its own scale.
"""

import math
from typing import List, Tuple

from app.config.render_constants import EARTH_RADIUS, MIN_BBOX_DIM_M, ROUND_DP


class CoordinateProjector:
    def __init__(self, bbox_3857: List[float], zone: Tuple[float, float, float, float]):
        self.min_x, self.min_y, self.max_x, self.max_y = bbox_3857
        if self.min_x >= self.max_x or self.min_y >= self.max_y:
            raise ValueError(f"Degenerate bbox_3857: {bbox_3857}")

        zx, zy, zw, zh = zone
        data_w = max(self.max_x - self.min_x, MIN_BBOX_DIM_M)
        data_h = max(self.max_y - self.min_y, MIN_BBOX_DIM_M)

        # "Contain" scaling: min() picks the binding axis; the other axis is
        # centered via padding. max() here would overflow the zone (§4).
        self.scale = min(zw / data_w, zh / data_h)
        self.origin_x = zx + (zw - data_w * self.scale) / 2
        self.origin_y = zy + (zh - data_h * self.scale) / 2

    def project(self, x: float, y: float) -> Tuple[float, float]:
        # Y-flip folded into the mapping as (max_y - y); a separate
        # height-minus pass double-counts the zone offset (§4).
        return (
            round(self.origin_x + (x - self.min_x) * self.scale, ROUND_DP),
            round(self.origin_y + (self.max_y - y) * self.scale, ROUND_DP),
        )

    def center_latitude_rad(self) -> float:
        """Inverse spherical Mercator latitude at the bbox's vertical center (§6.1)."""
        y_c = (self.min_y + self.max_y) / 2
        return 2 * math.atan(math.exp(y_c / EARTH_RADIUS)) - math.pi / 2

    def latitude_spread(self) -> float:
        """Ground-scale distortion ratio across the latitude span (§6.2)."""
        phi_min = 2 * math.atan(math.exp(self.min_y / EARTH_RADIUS)) - math.pi / 2
        phi_max = 2 * math.atan(math.exp(self.max_y / EARTH_RADIUS)) - math.pi / 2
        c_min, c_max = math.cos(phi_min), math.cos(phi_max)
        return max(c_min, c_max) / min(c_min, c_max)

    def ground_meters_per_px(self) -> float:
        """True ground distance represented by one SVG px at center latitude (§6.1)."""
        return math.cos(self.center_latitude_rad()) / self.scale
