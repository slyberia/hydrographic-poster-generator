"""Tests for the drone viewport export service (Option B: static-map composite).

Network-free: the Web Mercator math, tile-range/zoom clamping, and SVG
composition are pure functions, and cairosvg rasterises locally. Live tile
fetching (CARTO CDN) is exercised only in deployment, not here — the service is
built to degrade to a paper background when tiles are unavailable, which these
tests also assert.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import drone_export_service as e  # noqa: E402


# ---- Web Mercator pixel math (standard slippy-map convention) ----

def test_mercator_known_points():
    # Zoom 0 world is a single 256px tile; (0,0) sits dead centre.
    assert e._lon_to_px(0, 0) == pytest.approx(128.0)
    assert e._lat_to_px(0, 0) == pytest.approx(128.0)
    assert e._lon_to_px(-180, 0) == pytest.approx(0.0)
    assert e._lon_to_px(180, 0) == pytest.approx(256.0)


def test_mercator_doubles_per_zoom():
    # Each zoom level doubles the world width in pixels.
    assert e._lon_to_px(180, 1) == pytest.approx(512.0)
    assert e._lon_to_px(180, 2) == pytest.approx(1024.0)


def test_latitude_is_clamped_to_mercator_limit():
    # Beyond ±85.05° Mercator is undefined; clamping keeps px finite.
    assert e._lat_to_px(90, 3) == e._lat_to_px(85.05112878, 3)
    assert e._lat_to_px(-90, 3) == e._lat_to_px(-85.05112878, 3)


# ---- Viewport normalisation ----

def test_viewport_normalises_swapped_and_clamps_lat():
    vp = e.Viewport(west=10, south=80, east=-10, north=-80).normalised()
    assert vp.west == -10 and vp.east == 10   # swapped back into order
    assert vp.south == -80 and vp.north == 80
    hi = e.Viewport(west=0, south=-89, east=1, north=89).normalised()
    assert hi.north == pytest.approx(85.05112878)
    assert hi.south == pytest.approx(-85.05112878)


# ---- Zoom clamping bounds tile fetches ----

def test_choose_zoom_keeps_tile_count_bounded():
    # A wide region at a high requested zoom must clamp down under MAX_TILES.
    wide = e.Viewport(-60, 4, -56, 9).normalised()
    z = e.choose_zoom(wide, 15)
    tx0, ty0, tx1, ty1 = e._tile_range(wide, z)
    assert (tx1 - tx0 + 1) * (ty1 - ty0 + 1) <= e.MAX_TILES
    assert z <= 15


def test_choose_zoom_respects_small_viewport():
    # A tiny viewport should keep (not reduce) a modest requested zoom.
    small = e.Viewport(-58.11, 6.60, -58.09, 6.62).normalised()
    assert e.choose_zoom(small, 13) == 13


# ---- SVG composition ----

_HEX = {
    "geometry": {"type": "Polygon", "coordinates": [[
        [-58.10, 6.60], [-58.09, 6.60], [-58.09, 6.61],
        [-58.10, 6.61], [-58.10, 6.60],
    ]]},
    "properties": {"zone": "SUITABLE", "h3_index": "abc"},
}


def _vp_zoom():
    vp = e.Viewport(-58.12, 6.58, -58.07, 6.63).normalised()
    return vp, e.choose_zoom(vp, 12)


def test_build_svg_zones_colours_and_attribution():
    vp, z = _vp_zoom()
    svg, w, h = e.build_svg(vp, z, {}, [_HEX], "zones", None, set(), False)
    assert svg.startswith("<svg") and svg.rstrip().endswith("</svg>")
    assert "<polygon" in svg
    assert e.ZONE_FILL["SUITABLE"] in svg           # colour parity with frontend
    assert "OpenStreetMap" in svg and "CARTO" in svg  # ToS attribution baked in
    assert w > 0 and h > 0


def test_build_svg_hidden_zone_is_omitted():
    vp, z = _vp_zoom()
    svg, _, _ = e.build_svg(vp, z, {}, [_HEX], "zones", None, {"SUITABLE"}, False)
    assert "<polygon" not in svg  # the only cell's zone is hidden


def test_build_svg_volatility_mode_uses_category_colour():
    vp, z = _vp_zoom()
    svg, _, _ = e.build_svg(vp, z, {}, [_HEX], "volatility", {"abc": "HIGH"}, set(), False)
    assert e.VOLATILITY_FILL["HIGH"] in svg
    # A cell absent from the volatility map renders constraint-locked grey.
    svg2, _, _ = e.build_svg(vp, z, {}, [_HEX], "volatility", {}, set(), False)
    assert e.CONSTRAINT_LOCKED_FILL in svg2


def test_build_svg_degrades_without_tiles():
    # No tiles fetched (e.g. CDN unreachable) still yields a valid image with a
    # paper background rather than failing the export.
    vp, z = _vp_zoom()
    svg, _, _ = e.build_svg(vp, z, {}, [_HEX], "zones", None, set(), False)
    assert "#f6f4ef" in svg  # paper background rect
    assert "<image" not in svg


# ---- cairosvg rasterisation / PDF ----

def test_render_png_and_pdf_bytes():
    import cairosvg
    vp, z = _vp_zoom()
    svg, w, _ = e.build_svg(vp, z, {}, [_HEX], "zones", None, set(), False)
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=200)
    assert png[:8] == b"\x89PNG\r\n\x1a\n"
    pdf = cairosvg.svg2pdf(bytestring=svg.encode(), output_width=200)
    assert pdf[:5] == b"%PDF-"
