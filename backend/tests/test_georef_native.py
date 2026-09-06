from uuid import UUID

from app.models.clip_models import ClipMetadata, ClipResult
from app.models.export_models import ExportRequest
from app.services.georef_service import (
    build_manifest,
    generate_native_geotiff,
    write_geotiff,
    manifest_affine,
)
from PIL import Image
from rasterio.io import MemoryFile


def _clip():
    return ClipResult(
        features=[
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": [[0, 0], [100, 200]]},
                "properties": {"hydrorivers_id": 42},
            }
        ],
        metadata=ClipMetadata(
            geography_name="Test",
            region_code="T",
            river_count=1,
            classification_status="success",
            bbox_3857=[0, 0, 100, 200],
            bbox_4326=[0, 0, 1, 2],
        ),
    )


def _request():
    return ExportRequest(
        geography_id="g", export_format="geotiff", export_size="digital_poster"
    )


def test_manifest_contains_known_render_transform():
    manifest = build_manifest(
        _clip(), _request(), poster_id=UUID("00000000-0000-0000-0000-000000000001")
    )
    assert manifest.source_crs == "EPSG:4326"
    assert manifest.hydro_rivers_reference["geometry_in_manifest"] is False
    t = manifest.geographic_to_pixel
    assert t.x_scale > 0 and t.y_scale < 0
    assert t.x_scale == -t.y_scale
    assert manifest.render_dimensions == {"width": 1600, "height": 2400}


def test_native_alignment_matches_hydrorivers_ids():
    _, report = generate_native_geotiff(
        _clip(), _request(), build_manifest(_clip(), _request())
    )
    assert report.status == "passed"
    assert report.projected_feature_count == 1
    assert report.metrics["network_f1"] > 0.85


def test_geotiff_has_tiff_header_and_rgba_pixels():
    manifest = build_manifest(_clip(), _request())
    image = Image.frombytes("RGBA", (2, 1), bytes([1, 2, 3, 255, 4, 5, 6, 255]))
    payload = write_geotiff(image, ~manifest_affine(manifest), manifest)
    assert payload[:4] == b"II*\x00"
    with MemoryFile(payload) as mem, mem.open() as ds:
        assert ds.crs.to_epsg() == 3857
        assert ds.read(1).tolist() == [[1, 4]]
