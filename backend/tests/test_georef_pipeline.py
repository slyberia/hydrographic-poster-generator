import numpy as np
import pytest
from affine import Affine
from rasterio.io import MemoryFile
from app.models.clip_models import ClipMetadata, ClipResult
from app.models.export_models import ExportRequest
from app.services.georef_service import (
    build_manifest,
    native_result,
    render_poster,
    frame_box,
    manifest_affine,
)
from app.services.georef_validation import validate_raster


def network():
    rng = np.random.default_rng(191)
    features = []
    # Irregular networks, not periodic repeated landmarks.
    for i in range(45):
        x, y = rng.uniform(80, 920, 2)
        points = [[float(x), float(y)]]
        for j in range(6):
            x = np.clip(x + rng.uniform(-90, 90), 10, 990)
            y = np.clip(y + rng.uniform(10, 65), 10, 990)
            points.append([float(x), float(y)])
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": points},
                "properties": {"hydrorivers_id": i + 1, "display_class": "major"},
            }
        )
    return ClipResult(
        features=features,
        metadata=ClipMetadata(
            geography_name="Fixture",
            region_code="test",
            river_count=len(features),
            classification_status="success",
            bbox_3857=[0, 0, 1000, 1000],
            bbox_4326=[0, 0, 0.009, 0.009],
        ),
    )


def request(**kwargs):
    return ExportRequest(
        geography_id="fixture",
        export_format="geotiff",
        export_size="custom",
        custom_width=1200,
        custom_height=1200,
        **kwargs,
    )


@pytest.mark.parametrize(
    "settings",
    [
        {},
        {"design_asset_mode": True},
        {"layout_overrides": {"rivers": {"x": 30, "y": -20, "scale": 0.8}}},
    ],
)
def test_native_real_tiff_crs_crop_inverse_and_pixels(settings):
    clip = network()
    req = request(**settings)
    m = build_manifest(clip, req)
    tif, qc, preview = native_result(clip, req, m)
    assert qc.status == "passed", qc.model_dump()
    with MemoryFile(tif) as mem, mem.open() as ds:
        assert ds.crs.to_epsg() == 3857
        left, top, right, bottom = frame_box(m)
        assert (ds.width, ds.height) == (right - left, bottom - top)
        inverse = ~manifest_affine(m)
        assert ds.transform * (0, 0) == pytest.approx(inverse * (left, top))
        assert ds.transform * (ds.width, ds.height) == pytest.approx(
            inverse * (right, bottom)
        )
        np.testing.assert_array_equal(
            ds.read(),
            np.moveaxis(np.asarray(render_poster(clip, req).crop(frame_box(m))), 2, 0),
        )
        assert ds.tags()["AREA_OR_POINT"] == "Area"
    assert preview.startswith(b"\x89PNG")


def test_wrong_georeference_fails_network_validation():
    clip = network()
    req = request()
    m = build_manifest(clip, req)
    image = render_poster(clip, req).crop(frame_box(m))
    x, y, _, _ = frame_box(m)
    incorrect = ~manifest_affine(m) * Affine.translation(x + 250, y + 200)
    qc, _, _ = validate_raster(image, incorrect, clip, m, mode="native")
    assert qc.status == "failed"
    assert qc.metrics["network_displacement"]["rmse_m"] > 5


def test_manifest_contains_source_identity_and_all_layout_settings():
    m = build_manifest(
        network(),
        request(layout_overrides={"rivers": {"x": 12, "y": -20, "scale": 0.8}}),
    )
    assert m.source_crs == "EPSG:4326"
    assert m.source["geography_id"] == "fixture"
    assert m.render_settings["layout_overrides"]["rivers"]["x"] == 12
    assert "feature_ids_sha256" in m.hydro_rivers_reference
    assert len(m.model_dump_json()) < 12000
