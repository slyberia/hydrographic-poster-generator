"""Export pipeline tests (contract Part II, §9–12)."""

import re
import struct
import zlib

import pytest
from pydantic import ValidationError

from app.models.clip_models import ClipMetadata, ClipResult
from app.models.export_models import ExportRequest
from app.services.export_service import ExportService

BBOX = [0, 0, 1_000_000, 2_000_000]


def make_clip() -> ClipResult:
    features = [{
        "type": "Feature",
        "geometry": {"type": "LineString",
                     "coordinates": [[0, 0], [500_000, 1_000_000], [999_000, 1_999_000]]},
        "properties": {"display_class": "major"},
    }]
    return ClipResult(
        features=features,
        metadata=ClipMetadata(geography_name="Testland", region_code="test",
                              river_count=1, classification_status="success",
                              bbox_3857=BBOX),
    )


def png_dims(data: bytes):
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
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


def export(**kw):
    req = ExportRequest(geography_id="g", title="T", **kw)
    return ExportService.export(make_clip(), req)


def test_scale_path_png_dims_exact():
    payload, media, name = export(export_format="png", export_size="digital_poster")
    assert png_dims(payload) == (1600, 2400)
    assert media == "image/png" and name.endswith(".png")


def test_rerender_path_instagram_no_letterbox():
    payload, _, _ = export(export_format="png", export_size="instagram_portrait")
    assert png_dims(payload) == (1080, 1350)
    # Poster mode fills the canvas with the background rect; if the old
    # letterbox failure mode returns, corners would be transparent.
    from PIL import Image
    import io
    im = Image.open(io.BytesIO(payload)).convert("RGBA")
    for corner in [(0, 0), (1079, 0), (0, 1349), (1079, 1349)]:
        assert im.getpixel(corner)[3] == 255, f"transparent corner {corner}"


def test_square_design_asset_transparent():
    payload, _, _ = export(export_format="png", export_size="square_design_asset",
                           design_asset_mode=True)
    assert png_dims(payload) == (3000, 3000)
    from PIL import Image
    import io
    im = Image.open(io.BytesIO(payload)).convert("RGBA")
    assert im.getpixel((0, 0))[3] == 0  # transparent background preserved


def test_pdf_physical_page_size_18x24():
    payload, media, _ = export(export_format="pdf", export_size="print_18x24")
    box = pdf_mediabox(payload)
    # Contract §11.2 verified recipe: 18x24 in -> 1296 x 1728 pt.
    assert box[2] == pytest.approx(1296, abs=1) and box[3] == pytest.approx(1728, abs=1)
    assert media == "application/pdf"


def test_pdf_default_px_to_pt():
    payload, _, _ = export(export_format="pdf", export_size="high_res_poster")
    box = pdf_mediabox(payload)
    assert box[2] == pytest.approx(2700, abs=1) and box[3] == pytest.approx(4050, abs=1)


def test_svg_passthrough():
    payload, media, _ = export(export_format="svg", export_size="high_res_poster")
    assert payload.startswith(b"<svg") and media == "image/svg+xml"


def test_custom_size_limits():
    with pytest.raises(ValidationError):
        ExportRequest(geography_id="g", export_size="custom",
                      custom_width=800, custom_height=1200)   # short side < 1000
    with pytest.raises(ValidationError):
        ExportRequest(geography_id="g", export_size="custom",
                      custom_width=4000, custom_height=9600)  # long side > 9000
    with pytest.raises(ValidationError):
        ExportRequest(geography_id="g", export_size="custom")  # dims missing
    ok = ExportRequest(geography_id="g", export_size="custom",
                       custom_width=2000, custom_height=3000)
    assert ExportService.resolve_size(ok).width == 2000


def test_design_asset_pdf_rejected():
    with pytest.raises(ValidationError):
        ExportRequest(geography_id="g", design_asset_mode=True, export_format="pdf")
