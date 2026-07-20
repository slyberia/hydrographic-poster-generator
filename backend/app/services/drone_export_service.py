"""drone_export_service.py — server-side, print-quality export of the drone
zoning map for an arbitrary map viewport (Option B: static-map composite).

The frontend Leaflet map renders ~19.5k H3 cells client-side; this service
reproduces *what's on screen* on the server at an arbitrary resolution. The
contract is a bounding box, not the Region-4 polygon:

    input  = { bbox (EPSG:4326), zoom, format, scale, display_mode, ... }
    output = PNG | SVG | PDF of the basemap tiles + zoning hexes for that bbox

Full region is just "bbox = region extent"; a neighbourhood is "bbox = that
neighbourhood" — the same code path. Basemap tiles match the frontend
(CARTO ``light_all``); attribution is baked into the image per CARTO/OSM ToS.

Rendering path reuses the existing export dependency (cairosvg): tiles are
embedded as base64 ``<image>`` elements positioned by Web Mercator pixel math,
zoning cells are drawn as ``<polygon>`` over them, and cairosvg rasterises to
PNG/PDF (or the SVG is returned verbatim).
"""

from __future__ import annotations

import asyncio
import base64
import math
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import httpx

# ---------------------------------------------------------------------------
# Colours — MUST mirror frontend/src/lib/zoneTheme.ts (canvas cannot read CSS
# vars, and neither can the server; both sides keep an explicit hex copy).
# ---------------------------------------------------------------------------
ZONE_FILL: Dict[str, str] = {
    "PROHIBITED": "#b3362b",
    "RESTRICTED": "#d98e2b",
    "CONDITIONAL": "#e5c95c",
    "SUITABLE": "#5da06f",
}
VOLATILITY_FILL: Dict[str, str] = {
    "LOW": "#5da06f",
    "MEDIUM": "#e5c95c",
    "HIGH": "#b3362b",
}
CONSTRAINT_LOCKED_FILL = "#c8c8c8"
FALLBACK_FILL = "#999999"

# Match MapView.styleFor: fillOpacity 0.55, stroke = fill, weight 0.3, opacity 0.6.
FILL_OPACITY = 0.55
STROKE_OPACITY = 0.6
STROKE_WIDTH = 0.3

TILE_SIZE = 256
TILE_TEMPLATE = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
TILE_SUBDOMAIN = "a"
ATTRIBUTION = "© OpenStreetMap  © CARTO"

# Guard-rails: keep a single export bounded in tiles fetched and pixels rendered.
MAX_TILES = 96
MAX_OUTPUT_PX = 6000
MIN_ZOOM = 1
MAX_ZOOM = 18

FORMAT_MEDIA = {
    "png": "image/png",
    "svg": "image/svg+xml",
    "pdf": "application/pdf",
}


@dataclass
class Viewport:
    west: float
    south: float
    east: float
    north: float

    def normalised(self) -> "Viewport":
        w, e = sorted((self.west, self.east))
        s, n = sorted((self.south, self.north))
        # Clamp latitude to the Web Mercator limit.
        s = max(s, -85.05112878)
        n = min(n, 85.05112878)
        return Viewport(w, s, e, n)


# ---------------------------------------------------------------------------
# Web Mercator pixel math (standard slippy-map / Leaflet convention).
# ---------------------------------------------------------------------------
def _lon_to_px(lon: float, zoom: int) -> float:
    return (lon + 180.0) / 360.0 * TILE_SIZE * (2 ** zoom)


def _lat_to_px(lat: float, zoom: int) -> float:
    lat = max(min(lat, 85.05112878), -85.05112878)
    rad = math.radians(lat)
    y = (1.0 - math.log(math.tan(rad) + 1.0 / math.cos(rad)) / math.pi) / 2.0
    return y * TILE_SIZE * (2 ** zoom)


def choose_zoom(vp: Viewport, requested_zoom: int) -> int:
    """Clamp the requested zoom down until the bbox needs <= MAX_TILES tiles.

    Guarantees a bounded number of outbound tile fetches regardless of how far
    out the user's viewport is.
    """
    zoom = max(MIN_ZOOM, min(requested_zoom, MAX_ZOOM))
    while zoom > MIN_ZOOM:
        tx0, ty0, tx1, ty1 = _tile_range(vp, zoom)
        if (tx1 - tx0 + 1) * (ty1 - ty0 + 1) <= MAX_TILES:
            break
        zoom -= 1
    return zoom


def _tile_range(vp: Viewport, zoom: int) -> Tuple[int, int, int, int]:
    x_min = int(math.floor(_lon_to_px(vp.west, zoom) / TILE_SIZE))
    x_max = int(math.floor(_lon_to_px(vp.east, zoom) / TILE_SIZE))
    y_min = int(math.floor(_lat_to_px(vp.north, zoom) / TILE_SIZE))  # north = smaller y
    y_max = int(math.floor(_lat_to_px(vp.south, zoom) / TILE_SIZE))
    span = 2 ** zoom
    return (max(0, x_min), max(0, y_min),
            min(span - 1, x_max), min(span - 1, y_max))


def _ca_bundle() -> Any:
    """Honour an explicit CA bundle if the environment sets one (e.g. the dev
    agent proxy); otherwise use httpx's default verification. Prod Cloud Run
    reaches the CDN directly and needs neither."""
    return os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE") or True


async def _fetch_tiles(vp: Viewport, zoom: int, retina: bool) -> Dict[Tuple[int, int], bytes]:
    """Fetch every basemap tile covering the viewport. Missing/failed tiles are
    skipped (their patch stays paper-blank) rather than failing the export."""
    tx0, ty0, tx1, ty1 = _tile_range(vp, zoom)
    r = "@2x" if retina else ""
    coords = [(x, y) for x in range(tx0, tx1 + 1) for y in range(ty0, ty1 + 1)]
    results: Dict[Tuple[int, int], bytes] = {}

    sem = asyncio.Semaphore(8)
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(15.0),
        verify=_ca_bundle(),
        headers={"User-Agent": "hydro-drone-export/1.0"},
        follow_redirects=True,
    ) as client:
        async def grab(x: int, y: int) -> None:
            url = TILE_TEMPLATE.format(s=TILE_SUBDOMAIN, z=zoom, x=x, y=y, r=r)
            async with sem:
                try:
                    resp = await client.get(url)
                    if resp.status_code == 200 and resp.content:
                        results[(x, y)] = resp.content
                except httpx.HTTPError:
                    pass  # leave the patch blank

        await asyncio.gather(*(grab(x, y) for x, y in coords))
    return results


def _polygon_rings(geometry: Dict[str, Any]) -> List[List[List[float]]]:
    """Flatten Polygon / MultiPolygon into a list of outer+inner rings."""
    gtype = geometry.get("type")
    coords = geometry.get("coordinates", [])
    if gtype == "Polygon":
        return coords
    if gtype == "MultiPolygon":
        return [ring for poly in coords for ring in poly]
    return []


def _fill_for(props: Dict[str, Any], display_mode: str,
              volatility_by_h3: Optional[Dict[str, str]]) -> str:
    if display_mode == "volatility":
        h3 = props.get("h3_index")
        cat = volatility_by_h3.get(h3) if (volatility_by_h3 and h3) else None
        # Absent from the payload = constraint-locked (stable by definition).
        return VOLATILITY_FILL.get(cat, CONSTRAINT_LOCKED_FILL) if cat else CONSTRAINT_LOCKED_FILL
    zone = props.get("zone")
    return ZONE_FILL.get(zone, FALLBACK_FILL)


def build_svg(
    vp: Viewport,
    zoom: int,
    tiles: Dict[Tuple[int, int], bytes],
    features: List[Dict[str, Any]],
    display_mode: str,
    volatility_by_h3: Optional[Dict[str, str]],
    hidden_zones: Optional[set],
    retina: bool,
) -> Tuple[str, int, int]:
    """Compose the export SVG in zoom-z pixel space. Returns (svg, w_px, h_px)."""
    x_tl = _lon_to_px(vp.west, zoom)
    y_tl = _lat_to_px(vp.north, zoom)
    x_br = _lon_to_px(vp.east, zoom)
    y_br = _lat_to_px(vp.south, zoom)
    canvas_w = max(1.0, x_br - x_tl)
    canvas_h = max(1.0, y_br - y_tl)

    def px(lon: float, lat: float) -> Tuple[float, float]:
        return (_lon_to_px(lon, zoom) - x_tl, _lat_to_px(lat, zoom) - y_tl)

    parts: List[str] = []
    parts.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'width="{canvas_w:.2f}" height="{canvas_h:.2f}" '
        f'viewBox="0 0 {canvas_w:.2f} {canvas_h:.2f}">'
    )
    # Paper background shows through where tiles are missing / transparent.
    parts.append(f'<rect x="0" y="0" width="{canvas_w:.2f}" height="{canvas_h:.2f}" fill="#f6f4ef"/>')
    # Clip everything to the exact viewport rectangle.
    parts.append(
        f'<clipPath id="vp"><rect x="0" y="0" width="{canvas_w:.2f}" '
        f'height="{canvas_h:.2f}"/></clipPath>'
    )
    parts.append('<g clip-path="url(#vp)">')

    # Basemap tiles.
    for (tx, ty), data in tiles.items():
        ox = tx * TILE_SIZE - x_tl
        oy = ty * TILE_SIZE - y_tl
        b64 = base64.b64encode(data).decode("ascii")
        parts.append(
            f'<image x="{ox:.2f}" y="{oy:.2f}" width="{TILE_SIZE}" height="{TILE_SIZE}" '
            f'xlink:href="data:image/png;base64,{b64}" '
            f'preserveAspectRatio="none"/>'
        )

    # Zoning cells.
    hidden = hidden_zones or set()
    for feat in features:
        props = feat.get("properties", {})
        if display_mode != "volatility" and props.get("zone") in hidden:
            continue
        rings = _polygon_rings(feat.get("geometry") or {})
        if not rings:
            continue
        fill = _fill_for(props, display_mode, volatility_by_h3)
        for ring in rings:
            pts = " ".join(f"{cx:.2f},{cy:.2f}" for cx, cy in (px(lon, lat) for lon, lat in ring))
            parts.append(
                f'<polygon points="{pts}" fill="{fill}" fill-opacity="{FILL_OPACITY}" '
                f'stroke="{fill}" stroke-opacity="{STROKE_OPACITY}" '
                f'stroke-width="{STROKE_WIDTH}"/>'
            )
    parts.append('</g>')  # end clip

    # Attribution (required by CARTO/OSM ToS) — bottom-right, on a legibility plate.
    fs = max(10.0, canvas_h * 0.018)
    pad = fs * 0.4
    text_w = len(ATTRIBUTION) * fs * 0.5
    box_w = text_w + pad * 2
    box_h = fs + pad * 2
    bx = canvas_w - box_w
    by = canvas_h - box_h
    parts.append(
        f'<rect x="{bx:.2f}" y="{by:.2f}" width="{box_w:.2f}" height="{box_h:.2f}" '
        f'fill="#ffffff" fill-opacity="0.72"/>'
    )
    parts.append(
        f'<text x="{canvas_w - pad:.2f}" y="{canvas_h - pad:.2f}" '
        f'text-anchor="end" font-family="sans-serif" font-size="{fs:.1f}" '
        f'fill="#333333">{ATTRIBUTION}</text>'
    )
    parts.append('</svg>')

    return "".join(parts), int(round(canvas_w)), int(round(canvas_h))


async def render_export(
    pool,
    run_id: str,
    vp: Viewport,
    requested_zoom: int,
    fmt: str,
    scale: float,
    display_mode: str,
    sweep_id: Optional[str],
    hidden_zones: Optional[set],
) -> Tuple[bytes, str, str]:
    """Fetch geometry + tiles for the viewport and render to bytes.

    Returns (payload, media_type, filename). Raises ValueError on bad input.
    """
    from app.services import drone_service

    fmt = fmt.lower()
    if fmt not in FORMAT_MEDIA:
        raise ValueError(f"Unsupported format '{fmt}' (png, svg, pdf)")

    vp = vp.normalised()
    zoom = choose_zoom(vp, requested_zoom)
    retina = scale >= 2

    # Cells intersecting the viewport only — a sub-area never pulls the whole grid.
    fc = await drone_service.results_geojson(
        pool, run_id, bbox=(vp.west, vp.south, vp.east, vp.north)
    )
    features = fc.get("features", [])

    volatility_by_h3: Optional[Dict[str, str]] = None
    if display_mode == "volatility":
        if not sweep_id:
            raise ValueError("display_mode 'volatility' requires sweep_id")
        records = await drone_service.get_volatility_data(pool, run_id, sweep_id)
        volatility_by_h3 = {r["h3_index"]: r["volatility_category"] for r in records}

    tiles = await _fetch_tiles(vp, zoom, retina)

    svg, w_px, h_px = build_svg(
        vp, zoom, tiles, features, display_mode, volatility_by_h3, hidden_zones, retina
    )

    filename = f"drone_zoning_{display_mode}.{fmt}"

    if fmt == "svg":
        return svg.encode("utf-8"), FORMAT_MEDIA["svg"], filename

    # Rasterise / PDF via cairosvg, clamped so a huge bbox×scale can't OOM.
    import cairosvg

    out_w = w_px * scale
    longest = max(out_w, h_px * scale)
    if longest > MAX_OUTPUT_PX:
        scale *= MAX_OUTPUT_PX / longest
        out_w = w_px * scale

    if fmt == "png":
        payload = cairosvg.svg2png(bytestring=svg.encode("utf-8"), output_width=int(round(out_w)))
    else:  # pdf
        payload = cairosvg.svg2pdf(bytestring=svg.encode("utf-8"), output_width=int(round(out_w)))

    return payload, FORMAT_MEDIA[fmt], filename
