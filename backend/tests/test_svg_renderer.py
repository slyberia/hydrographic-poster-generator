"""Structural + scale bar tests for SVGRenderer (contract §5–6)."""

import re

import pytest

from app.models.clip_models import ClipMetadata, ClipResult
from app.models.render_models import RenderRequest
from app.services.svg_renderer import SVGRenderer

BBOX = [0, 0, 1_000_000, 2_000_000]


def make_clip(features=None, bbox=BBOX) -> ClipResult:
    if features is None:
        features = [
            {  # plain LineString
                "type": "Feature",
                "geometry": {"type": "LineString",
                             "coordinates": [[0, 0], [500_000, 1_000_000], [999_000, 1_999_000]]},
                "properties": {"display_class": "major"},
            },
            {  # MultiLineString: must still emit ONE path element
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
                              classification_status="success", bbox_3857=bbox),
    )


def render(**overrides) -> str:
    kwargs = {"geography_id": "g", "title": "Test Title", "subtitle": "Sub"}
    kwargs.update(overrides)
    req = RenderRequest(**kwargs)
    return SVGRenderer(req).generate_svg(make_clip())


def test_root_element_contract():
    svg = render()
    assert 'viewBox="0 0 3600 5400"' in svg
    assert 'width="3600" height="5400"' in svg
    assert "preserveAspectRatio" not in svg  # default xMidYMid meet (§14)


def test_one_path_per_feature_with_classes():
    svg = render()
    paths = re.findall(r'<path class="river (\w+)"', svg)
    assert paths == ["major", "headwater"]
    # MultiLineString: one element, two subpaths (two M commands)
    d = re.search(r'<path class="river headwater" d="([^"]+)"', svg).group(1)
    assert d.count("M") == 2


def test_poster_chrome_present():
    svg = render()
    for marker in ("Test Title", "Sub", 'id="legend"', 'id="metadata"',
                   'id="north-arrow"', "Data source:", "Boundary source:",
                   "Projection:", "Generated:", "<rect"):
        assert marker in svg, f"missing {marker}"


def test_design_asset_mode_strips_chrome():
    svg = render(design_asset_mode=True)
    assert 'id="rivers"' in svg
    for marker in ("<rect", "Test Title", 'id="legend"', 'id="metadata"',
                   'id="north-arrow"', 'id="scale-bar"', "<text"):
        assert marker not in svg, f"chrome leaked: {marker}"


def test_scale_bar_values_match_contract():
    svg = render()
    assert "200 km (approx.)" in svg  # contract §7 verified value
    x1 = float(re.search(r'<g id="scale-bar"><line class="scalebar" x1="([\d.]+)"', svg).group(1))
    x2 = 3300.0  # right anchor
    assert x2 - x1 == pytest.approx(354.3, abs=1.0)


def test_scale_bar_omitted_for_tall_maps():
    # Chile-like latitude span: spread > 1.20 -> no bar, honesty note instead.
    tall_bbox = [0, -8_000_000, 1_000_000, -2_000_000]
    req = RenderRequest(geography_id="g")
    svg = SVGRenderer(req).generate_svg(make_clip(bbox=tall_bbox))
    assert 'id="scale-bar"' not in svg
    assert "Scale varies across map" in svg
    assert "(approx.)" not in svg


def test_empty_rivers_still_renders_frame():
    req = RenderRequest(geography_id="g", title="Empty")
    svg = SVGRenderer(req).generate_svg(make_clip(features=[]))
    assert 'id="rivers"' in svg and "Empty" in svg and "<rect" in svg


def test_user_text_is_escaped():
    svg = render(title='<script>"x"&</script>')
    assert "<script>" not in svg
    assert "&lt;script&gt;" in svg


def test_missing_bbox_rejected():
    clip = make_clip()
    clip.metadata.bbox_3857 = None
    with pytest.raises(ValueError):
        SVGRenderer(RenderRequest(geography_id="g")).generate_svg(clip)


def test_svg_is_well_formed_xml():
    # Bare '&' in the Google Fonts @import URL once broke XML parsing;
    # every renderer output must survive a strict XML parse.
    import xml.etree.ElementTree as ET
    for kwargs in ({}, {"design_asset_mode": True}, {"palette": "parchment"}):
        ET.fromstring(render(**kwargs))


def test_unknown_presets_rejected():
    with pytest.raises(ValueError):
        SVGRenderer(RenderRequest(geography_id="g", palette="nope"))
    with pytest.raises(ValueError):
        SVGRenderer(RenderRequest(geography_id="g", typography="nope"))
