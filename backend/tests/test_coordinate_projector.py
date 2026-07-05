"""Numeric tests for the transform contract (docs/PROJECTION_SCALEBAR_NOTES.md §7).

These guard the three silent failure modes: squish (wrong scale rule),
upside-down map (missing Y-flip), and mis-registration (double-counted
zone offset). Vectors are the contract's machine-verified values.
"""

import math

import pytest

from app.services.coordinate_projector import CoordinateProjector

ZONE = (700, 950, 2600, 3500)
BBOX = [0, 0, 1_000_000, 2_000_000]


@pytest.fixture
def projector():
    return CoordinateProjector(BBOX, ZONE)


def test_scale_and_padding(projector):
    assert projector.scale == pytest.approx(0.00175)
    # height binds; horizontal padding centers: origin_x = 700 + 425
    assert projector.origin_x == pytest.approx(1125.0)
    assert projector.origin_y == pytest.approx(950.0)


@pytest.mark.parametrize("point,expected", [
    ((0, 2_000_000), (1125.0, 950.0)),        # NW corner -> zone top-left
    ((1_000_000, 0), (2875.0, 4450.0)),       # SE corner -> zone bottom-right
    ((500_000, 1_000_000), (2000.0, 2700.0)), # centroid -> zone center
    ((0, 0), (1125.0, 4450.0)),               # SW corner -> bottom-left (Y-flip)
])
def test_corner_vectors(projector, point, expected):
    sx, sy = projector.project(*point)
    assert sx == pytest.approx(expected[0], abs=0.1)
    assert sy == pytest.approx(expected[1], abs=0.1)


def test_all_points_inside_zone(projector):
    zx, zy, zw, zh = ZONE
    for x in (0, 250_000, 999_999):
        for y in (0, 1_500_000, 1_999_999):
            sx, sy = projector.project(x, y)
            assert zx <= sx <= zx + zw
            assert zy <= sy <= zy + zh


def test_aspect_preserved_wide_bbox():
    # Width-binding case: 2:1 landscape bbox in the portrait zone.
    p = CoordinateProjector([0, 0, 2_000_000, 1_000_000], ZONE)
    assert p.scale == pytest.approx(2600 / 2_000_000)
    ne = p.project(2_000_000, 1_000_000)
    sw = p.project(0, 0)
    drawn_w, drawn_h = ne[0] - sw[0], sw[1] - ne[1]
    assert drawn_w / drawn_h == pytest.approx(2.0, rel=1e-3)


def test_scale_bar_math(projector):
    # Contract §7 verified values.
    phi = projector.center_latitude_rad()
    assert math.degrees(phi) == pytest.approx(8.947, abs=0.01)
    assert math.cos(phi) == pytest.approx(0.98783, abs=1e-4)
    assert projector.ground_meters_per_px() == pytest.approx(564.5, abs=0.5)
    assert projector.latitude_spread() == pytest.approx(1.0496, abs=1e-3)


def test_southern_hemisphere_spread_symmetry():
    north = CoordinateProjector([0, 0, 1_000_000, 2_000_000], ZONE)
    south = CoordinateProjector([0, -2_000_000, 1_000_000, 0], ZONE)
    assert south.latitude_spread() == pytest.approx(north.latitude_spread(), rel=1e-9)


def test_degenerate_bbox_rejected():
    with pytest.raises(ValueError):
        CoordinateProjector([5, 5, 5, 10], ZONE)
    with pytest.raises(ValueError):
        CoordinateProjector([0, 10, 10, 10], ZONE)
