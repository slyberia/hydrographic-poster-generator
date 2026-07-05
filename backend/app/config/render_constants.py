"""Layout and rendering constants.

Normative source: docs/PROJECTION_SCALEBAR_NOTES.md (§2, §5.2, §6, §15).
Change values there first; this module mirrors the contract.
"""

# Reference canvas (portrait, 2:3)
CANVAS_W = 3600
CANVAS_H = 5400

# Poster Protocol — Active Map Zone (x, y, w, h).
# Right-weighted: left margin 700 > right margin 300; height 3500/5400 = 64.8%.
POSTER_ZONE = (700, 950, 2600, 3500)

# Design Asset Mode — uniform margin, no chrome.
ASSET_MARGIN = 150
ASSET_ZONE = (150, 150, CANVAS_W - 2 * ASSET_MARGIN, CANVAS_H - 2 * ASSET_MARGIN)

# Fractions of the reference canvas, used by the Phase 5 re-render path (§10).
ZONE_X_F = POSTER_ZONE[0] / CANVAS_W
ZONE_Y_F = POSTER_ZONE[1] / CANVAS_H
ZONE_W_F = POSTER_ZONE[2] / CANVAS_W
ZONE_H_F = POSTER_ZONE[3] / CANVAS_H
ASSET_MARGIN_F = ASSET_MARGIN / CANVAS_W

# Emitted SVG coordinate precision (§5.2): 1 dp is sub-pixel at 3600 px width.
ROUND_DP = 1

# Spherical Mercator radius, WGS84 semi-major axis (§1). Not 6371000.
EARTH_RADIUS = 6378137.0

# Stroke widths per display_class at the reference canvas (§5.2).
STROKE_WIDTHS = {
    "major": 6.0,
    "primary": 4.0,
    "secondary": 2.5,
    "minor": 1.5,
    "headwater": 0.8,
}

# Scale bar (§6): target length in px at reference canvas; omit the bar when
# ground-scale distortion across the latitude span exceeds this spread.
SCALE_BAR_TARGET_PX = 600
SCALE_BAR_MAX_SPREAD = 1.20

# Typography reference sizes at the reference canvas (§15).
TITLE_SIZE = 200
SUBTITLE_SIZE = 90
TITLE_BLOCK_X = 300
TITLE_BLOCK_W = 3000

# Guards (§3.2)
MIN_BBOX_DIM_M = 1.0                 # clamp for degenerate dimensions
ANTIMERIDIAN_WARN_W_M = 20_000_000.0  # bbox wider than this ⇒ likely wraps ±180°

# Metadata block sources (docs/DATA_INGESTION.md)
DATA_SOURCE = "HydroRIVERS v1.0 (WWF)"
BOUNDARY_SOURCE = "geoBoundaries (CC BY 4.0)"
PROJECTION_LABEL = "Web Mercator (EPSG:3857)"
