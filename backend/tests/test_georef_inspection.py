import numpy as np
import pytest
from affine import Affine
from PIL import Image
from app.services.georef_service import build_manifest, write_geotiff, viewer_image
from app.services.georef_validation import validate_raster
from app.services.georef_inspection import inspect_features, clip_segment
from test_georef_pipeline import network, request


@pytest.mark.parametrize('affine', [Affine(200, 0, -6800000, 0, -200, 900000),
    Affine(180, 70, -6800000, 60, -210, 900000)])
def test_viewer_preserves_affine_corners(affine):
    m = build_manifest(network(), request())
    payload = write_geotiff(Image.new('RGBA', (1600, 1200)), affine, m)
    png, view = viewer_image(payload)
    assert png.startswith(b'\x89PNG')
    assert max(view['width'], view['height']) <= 1000
    actual = Affine(*view['pixel_to_world'])
    for x, y in [(0,0), (1,0), (0,1), (1,1)]:
        assert actual * (x*view['width'],y*view['height']) == pytest.approx(affine*(x*1600,y*1200))


def test_no_ink_still_reports_unmeasured_accuracy_and_scale():
    m = build_manifest(network(), request())
    qc, _, _ = validate_raster(Image.new('RGBA',(120,120),'white'),
        Affine(10,0,0,0,-10,1000), network(), m, mode='recovery')
    assert qc.status == 'failed'
    assert qc.metrics['evidence']['absolute_geographic_accuracy']['status'] == 'not_measured'
    assert qc.metrics['tolerance_ground_m']['max'] > 29
    assert qc.metrics['out_of_frame_vertices_measured'] is True


def test_inspection_is_bounded_without_mutating_source():
    clip=network()
    result=inspect_features(clip, [-1,-1,1,1], limit=3)
    assert len(result['features']) == 3
    assert result['truncated'] is True
    assert len(clip.features) == 45
    assert result['features'][0]['properties']['name_status'] == 'not_evaluated'
    assert 'name_status' not in clip.features[0]['properties']


def test_empty_viewport_returns_no_features():
    assert inspect_features(network(), [-60,1,-59,2])['features'] == []


def test_viewport_segment_crossing_and_exclusion():
    assert clip_segment([-10, 5], [20, 5], [0, 0, 10, 10]) == [[0, 5], [10, 5]]
    assert clip_segment([-10, -5], [20, -5], [0, 0, 10, 10]) is None
    assert clip_segment([5, -10], [5, 20], [0, 0, 10, 10]) == [[5, 0], [5, 10]]
