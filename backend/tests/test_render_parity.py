"""Preview vs. export parity (Poster Phase 5, §4 of PHASE_5_6_COMPLETION_PLAN).

Both the /preview route and ExportService render through the single
``SVGRenderer``, so SVG-level parity is assertable without a browser or a
database: for every settings-matrix entry, the SVG produced via the preview
path (``SVGRenderer(RenderRequest).generate_svg``) and via
``ExportService.export(format="svg")`` must be byte-identical when rendered
at the same canvas.

PNG/PDF parity is *structural*, not pixel-perfect: CairoSVG conversion must
succeed for each matrix entry, PNG dimensions must match the requested
export size exactly, and the PDF page box must match the documented pt math
(px * 0.75, or physical inches * 72). Pixel-perfect raster diffing is NOT
required — the shared renderer plus these dimension checks is the parity
contract; one manual visual pass on a live stack remains recommended before
deploy (docs/DEPLOYMENT.md rollout checklist).
"""

import re
import struct
import zlib

import pytest

from app.models.clip_models import ClipMetadata, ClipResult
from app.models.export_models import ExportRequest
from app.models.render_models import RenderRequest
from app.services.export_service import SIZE_REGISTRY, ExportService
from app.services.svg_renderer import SVGRenderer

BBOX = [0, 0, 1_000_000, 2_000_000]


def make_clip() -> ClipResult:
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "LineString",
                         "coordinates": [[0, 0], [500_000, 1_000_000],
                                         [999_000, 1_999_000]]},
            "properties": {"display_class": "major"},
        },
        {
            "type": "Feature",
            "geometry": {"type": "MultiLineString",
                         "coordinates": [[[0, 500_000], [200_000, 600_000]],
                                         [[300_000, 700_000], [400_000, 900_000]]]},
            "properties": {"display_class": "headwater"},
        },
    ]
    return ClipResult(
        features=features,
        metadata=ClipMetadata(geography_name="Testland", region_code="test",
                              river_count=len(features),
                              classification_status="success", bbox_3857=BBOX),
    )


BASE_SETTINGS = {
    "geography_id": "g",
    "title": "Parity Title",
    "subtitle": "Parity Subtitle",
}

# The §4 settings matrix: each metadata toggle off in turn, a typography
# override set, a layout override set, and design-asset mode.
ALL_META = {k: True for k in ("show_title", "show_subtitle", "show_legend",
                              "show_north_arrow", "show_scale_bar",
                              "show_data_credits")}

SETTINGS_MATRIX = {
    "baseline": {},
    **{
        f"meta_{key}_off": {"metadata_options": {**ALL_META, key: False}}
        for key in ALL_META
    },
    "typography_overrides": {
        "typography_overrides": {"title_font": "Roboto Mono",
                                 "title_weight": "700",
                                 "subtitle_tracking": "0.1em"},
    },
    "layout_overrides": {
        "layout_overrides": {"title_block": {"x": 120.0, "y": -80.0, "scale": 1.25},
                             "legend": {"x": -40.0, "y": 60.0, "scale": 0.9}},
    },
    "design_asset_mode": {"design_asset_mode": True},
}

MATRIX_IDS = list(SETTINGS_MATRIX)


def matrix_settings(name: str) -> dict:
    return {**BASE_SETTINGS, **SETTINGS_MATRIX[name]}


def png_dims(data: bytes):
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG payload"
    return struct.unpack(">II", data[16:24])


def pdf_mediabox(data: bytes):
    boxes = re.findall(rb"MediaBox\s*\[([^\]]+)\]", data)
    if not boxes:
        for m in re.finditer(rb"stream\r?\n(.*?)endstream", data, re.S):
            try:
                boxes += re.findall(rb"MediaBox\s*\[([^\]]+)\]",
                                    zlib.decompress(m.group(1)))
            except zlib.error:
                continue
    return [float(v) for v in boxes[0].split()]


# --------------------------------------------------------------- SVG parity


@pytest.mark.parametrize("name", MATRIX_IDS)
def test_svg_preview_export_byte_identical(name):
    """Preview-path SVG == ExportService SVG at the same canvas, byte for byte."""
    settings = matrix_settings(name)
    export_req = ExportRequest(**settings, export_format="svg",
                               export_size="high_res_poster")
    size = SIZE_REGISTRY["high_res_poster"]

    preview_svg = SVGRenderer(RenderRequest(**settings),
                              canvas=(size.width, size.height)
                              ).generate_svg(make_clip())
    payload, media, _ = ExportService.export(make_clip(), export_req)

    assert media == "image/svg+xml"
    assert payload == preview_svg.encode("utf-8")


def test_svg_parity_holds_at_preview_canvas():
    """The /preview route renders at 2400x3600; same renderer, same output."""
    settings = matrix_settings("baseline")
    a = SVGRenderer(RenderRequest(**settings), canvas=(2400, 3600)).generate_svg(make_clip())
    b = SVGRenderer(ExportRequest(**settings, export_format="svg",
                                  export_size="high_res_poster"),
                    canvas=(2400, 3600)).generate_svg(make_clip())
    assert a == b


# ------------------------------------------------------- structural parity


@pytest.mark.parametrize("name", MATRIX_IDS)
@pytest.mark.parametrize("export_size", ["digital_poster", "instagram_portrait"])
def test_png_dimensions_exact(name, export_size):
    settings = matrix_settings(name)
    req = ExportRequest(**settings, export_format="png", export_size=export_size)
    payload, media, _ = ExportService.export(make_clip(), req)
    size = SIZE_REGISTRY[export_size]
    assert media == "image/png"
    assert png_dims(payload) == (size.width, size.height)


@pytest.mark.parametrize("name", MATRIX_IDS)
def test_pdf_page_box_matches(name):
    settings = matrix_settings(name)
    if settings.get("design_asset_mode"):
        pytest.skip("design assets are PNG/SVG only (contract §12)")
    req = ExportRequest(**settings, export_format="pdf",
                        export_size="digital_poster")
    payload, media, _ = ExportService.export(make_clip(), req)
    assert media == "application/pdf"
    # CairoSVG: px at CSS 96/in -> page pt = px * 0.75 (contract §11.2).
    box = pdf_mediabox(payload)
    assert box == [0.0, 0.0, 1600 * 0.75, 2400 * 0.75]


def test_pdf_physical_print_page_box():
    req = ExportRequest(**matrix_settings("baseline"), export_format="pdf",
                        export_size="print_18x24")
    payload, _, _ = ExportService.export(make_clip(), req)
    # 18x24 in at 72 pt/in -> 1296 x 1728 pt exact page.
    assert pdf_mediabox(payload) == [0.0, 0.0, 18 * 72.0, 24 * 72.0]
