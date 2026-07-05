# Projection, Coordinate Transform & Scale Bar Contract (Phase 4)

This document is the **normative math contract** for the Phase 4 `SVGRenderer`.
Every draw call (rivers, legend anchor, scale bar, north arrow) MUST consume the
single transform defined here. No renderer method may derive its own scale.

Status: satisfies CLAUDE.md Open Investigation Item #4 (Projection and Scale Bar
Handling). If implementation deviates, update this document first.

---

## 1. Coordinate Systems

| Space | CRS / Units | Origin | Y direction |
| :--- | :--- | :--- | :--- |
| Storage | EPSG:4326 (deg) | — | north = +Y |
| Working | EPSG:3857 (m) | equator/Greenwich | north = +Y |
| Canvas | SVG user units (px) | top-left | **south = +Y** |

All geometry leaves PostGIS already in EPSG:3857 (`ST_Transform(..., 3857)`).
Python performs only affine math; no reprojection happens outside the database.

Spherical-Mercator Earth radius (WGS84 semi-major axis):

```text
R = 6378137.0  (meters, exact constant — do not use 6371000)
```

---

## 2. Canvas Constants

```text
CANVAS_W = 3600        # px, fixed internal resolution
CANVAS_H = 5400        # px, portrait

# Poster Protocol — Active Map Zone (poster mode)
# Right-weighted: left margin (700) > right margin (300) to leave
# negative space on the left per the spec. Height 3500/5400 = 64.8%,
# inside the spec's 60–70% band.
ZONE_X = 700           # left edge of map zone
ZONE_Y = 950           # top edge (reserves title block above)
ZONE_W = 2600          # right edge lands at 3300
ZONE_H = 3500          # bottom edge lands at 4450 (reserves legend/metadata below)

# Design Asset Mode — no chrome, uniform margin
ASSET_MARGIN = 150
ASSET_ZONE = (150, 150, 3300, 5100)   # x, y, w, h

ROUND_DP = 1           # decimal places for emitted SVG coordinates
```

These are tunable style constants, but any change MUST keep the map height in
the 60–70% band and keep the left margin strictly greater than the right.

---

## 3. Inputs

### 3.1 Bounding box (from the boundary polygon, never the rivers)

The frame is derived from the **admin boundary**, so it is stable across
density presets. `ST_Extent` returns a `BOX2D` requiring text parsing; since
the boundary is a single row, use scalar accessors instead:

```sql
WITH geo AS (
    SELECT name, region_code, geom,
           ST_Transform(geom, 3857) AS geom_3857
    FROM admin_boundaries
    WHERE id = $1
)
SELECT
    ST_XMin(geo.geom_3857) AS bbox_min_x,
    ST_YMin(geo.geom_3857) AS bbox_min_y,
    ST_XMax(geo.geom_3857) AS bbox_max_x,
    ST_YMax(geo.geom_3857) AS bbox_max_y,
    ...
```

River geometries are projected in the same query:
`ST_AsGeoJSON(ST_Transform(ST_Intersection(hr.geom, geo.geom), 3857))`.

`ClipMetadata` carries the result as:

```text
bbox_3857: List[float]   # [min_x, min_y, max_x, max_y], meters, EPSG:3857
```

### 3.2 Validity guards (checked before any scaling)

| Condition | Action |
| :--- | :--- |
| `min_x >= max_x` or `min_y >= max_y` | 422 — degenerate boundary |
| `data_w` or `data_h` < 1.0 m | clamp that dimension to 1.0 m (prevents divide-by-zero) |
| `data_w` > 20,000,000 m (~20,000 km) | QA **warning**: bbox likely spans the antimeridian (e.g. Aleutians); output will be malformed. Known MVP limitation — document, do not crash. |
| `river_count == 0` | still render the poster frame/chrome from `bbox_3857`; QA warning |

---

## 4. The Transform (single source of truth)

Let `zone = (ZX, ZY, ZW, ZH)` be the active map zone (§2, mode-dependent).

```text
data_w = max_x - min_x
data_h = max_y - min_y

scale  = min(ZW / data_w, ZH / data_h)      # "contain" — min is mandatory.
                                             # max or per-axis scale = distortion.

pad_x  = (ZW - data_w * scale) / 2           # centers the non-binding axis
pad_y  = (ZH - data_h * scale) / 2           # exactly one pad is 0

sx = ZX + pad_x + (x - min_x) * scale
sy = ZY + pad_y + (max_y - y) * scale        # Y-flip folded into the mapping
```

The Y-flip is expressed as `(max_y - y)` — **not** as a separate
`height - scaled_y` pass. A second-pass flip against canvas height
double-counts the zone offset and mis-registers the map.

### 4.1 Invariants (provable from the formulas; assert them in tests)

1. **NW data corner → zone top-left:** `(min_x, max_y) → (ZX + pad_x, ZY + pad_y)`
2. **SE data corner → zone bottom-right:** `(max_x, min_y) → (ZX + pad_x + data_w·scale, ZY + pad_y + data_h·scale)`
3. `min(pad_x, pad_y) == 0` and both `>= 0` (binding axis fills the zone)
4. Every projected point lies inside `[ZX, ZX+ZW] × [ZY, ZY+ZH]`
5. Aspect ratio is preserved: `(data_w·scale) / (data_h·scale) == data_w / data_h`

### 4.2 Implementation shape

One object, constructed once per render, consumed by every draw call:

```python
class CoordinateProjector:
    def __init__(self, bbox_3857: list[float], zone: tuple[float, float, float, float]):
        self.min_x, self.min_y, self.max_x, self.max_y = bbox_3857
        zx, zy, zw, zh = zone
        data_w = max(self.max_x - self.min_x, 1.0)
        data_h = max(self.max_y - self.min_y, 1.0)
        self.scale = min(zw / data_w, zh / data_h)
        self.origin_x = zx + (zw - data_w * self.scale) / 2
        self.origin_y = zy + (zh - data_h * self.scale) / 2

    def project(self, x: float, y: float) -> tuple[float, float]:
        return (
            round(self.origin_x + (x - self.min_x) * self.scale, ROUND_DP),
            round(self.origin_y + (self.max_y - y) * self.scale, ROUND_DP),
        )
```

The scale bar (§6) MUST read `projector.scale` — never recompute it.

---

## 5. Geometry Serialization

### 5.1 Normalization (one code path, not two)

```text
LineString      coordinates depth 2: [[x, y], ...]        → lines = [coordinates]
MultiLineString coordinates depth 3: [[[x, y], ...], ...]  → lines = coordinates
anything else                                              → skip feature
```

### 5.2 Emission rules

- **One `<path>` per feature**, subpath per line: `d="M x,y L x,y ... M x,y L ..."`.
  Not one `<polyline>` per segment — a MultiLineString stays a single element,
  so element count == feature count (tests depend on this).
- `class` attribute = the feature's `display_class`
  (`major | primary | secondary | minor | headwater`).
- All coordinates rounded to `ROUND_DP` (1 dp is sub-pixel at 3600 px width;
  at 24 in / 300 dpi print, 0.1 px ≈ 0.0067 in — invisible).
- **Dedupe after rounding:** drop consecutive identical rounded points.
  A line with < 2 surviving points is dropped; a feature with 0 surviving
  lines is skipped.
- Stroke styling lives in the `<style>` block, per class
  (reference widths at 3600 px canvas — tunable):

```text
.major     stroke-width: 6
.primary   stroke-width: 4
.secondary stroke-width: 2.5
.minor     stroke-width: 1.5
.headwater stroke-width: 0.8
all:       fill: none; stroke-linecap: round; stroke-linejoin: round
```

---

## 6. Scale Bar (approximate, honestly)

Web Mercator inflates distance by `1/cos(φ)` at latitude φ. The bar is
computed at the map's central latitude and always labeled approximate.

### 6.1 Formulas

```text
y_c        = (min_y + max_y) / 2                       # projected meters
φ          = 2·atan(exp(y_c / R)) − π/2                # inverse spherical Mercator (radians)
m_per_px   = cos(φ) / projector.scale                  # ground meters per SVG px

TARGET_BAR_PX = 600                                    # tunable
raw_m      = TARGET_BAR_PX · m_per_px
nice_m     = largest value in {1, 2, 5}·10^n with nice_m ≤ raw_m   # deterministic floor
bar_px     = nice_m / m_per_px
label      = "{nice} km (approx.)"  if nice_m ≥ 1000 else "{nice} m (approx.)"
```

### 6.2 Honesty rule (per CLAUDE.md: "Do not render a misleading scale bar")

Compute the distortion spread across the map's latitude span:

```text
φ_min = 2·atan(exp(min_y / R)) − π/2
φ_max = 2·atan(exp(max_y / R)) − π/2
spread = max(cos φ_min, cos φ_max) / min(cos φ_min, cos φ_max)
```

- `spread ≤ 1.20` → render the bar, labeled approximate.
- `spread > 1.20` → **omit the bar**; print `"Scale varies across map"` in the
  metadata block instead, and emit a QA warning (severity: `warning`).

Example: Chile (lat −17.5° to −56°) → spread = cos 17.5° / cos 56° =
0.9537 / 0.5592 ≈ 1.71 → no bar. A tall-country scale bar would be off by up
to ~70% at the map edges; that is exactly the misleading artifact the spec forbids.

Note `cos φ` is symmetric in the sign of φ, so the southern hemisphere needs
no special-casing.

---

## 7. Numeric Test Vectors (fixture contract)

Poster zone `(700, 950, 2600, 3500)`, `bbox_3857 = [0, 0, 1_000_000, 2_000_000]`.

Derived values:

```text
data_w = 1_000_000        data_h = 2_000_000
scale  = min(2600/1e6, 3500/2e6) = min(0.0026, 0.00175) = 0.00175   (height binds)
pad_x  = (2600 − 1750)/2 = 425          pad_y = 0
```

| Input (x, y) EPSG:3857 | Expected SVG (sx, sy) | Meaning |
| :--- | :--- | :--- |
| (0, 2 000 000) | (1125.0, 950.0) | NW corner → zone top-left + pad_x |
| (1 000 000, 0) | (2875.0, 4450.0) | SE corner → zone bottom-right − pad_x |
| (500 000, 1 000 000) | (2000.0, 2700.0) | centroid → zone center |
| (0, 0) | (1125.0, 4450.0) | SW corner → bottom-left (Y-flip proof) |

Scale bar for the same fixture:

```text
y_c      = 1_000_000
φ        = 2·atan(exp(1e6 / 6378137)) − π/2 ≈ 0.15615 rad ≈ 8.947°
cos φ    ≈ 0.98783
m_per_px ≈ 0.98788 / 0.00175 ≈ 564.5
raw_m    ≈ 600 · 564.5 ≈ 338 700
nice_m   = 200 000  (largest 1-2-5 ≤ 338 700)
bar_px   ≈ 200 000 / 564.5 ≈ 354.3
label    = "200 km (approx.)"
spread   = cos(0°) / cos(17.679°) ≈ 1.050 ≤ 1.20 → bar renders
```

A fixture test that asserts the four corner projections (±0.1) and the scale
bar values (±1%) directly guards against the three silent failure modes:
squish (wrong `min`), upside-down map (missing/incorrect Y-flip), and
mis-registration (double-counted zone offset). Structural assertions
(viewBox, path count, chrome absence in design-asset mode) are secondary.

---

## 8. Known Limitations (MVP-accepted)

1. **Web Mercator area inflation** at high latitude (Greenland effect) —
   accepted MVP tradeoff vs. per-geography Albers/UTM selection. Revisit
   post-MVP if area fidelity becomes a requirement.
2. **Antimeridian-crossing geographies** (Aleutian Islands) produce a
   near-world-width bbox and a collapsed map. Guarded by QA warning (§3.2),
   not fixed in MVP.
3. Scale bar accuracy degrades with latitude span; mitigated by the §6.2
   omission rule rather than by projection change.
