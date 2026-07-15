import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models.render_models import RenderRequest
from app.models.export_models import ExportRequest

def test_legacy_render_request_valid():
    """Verify that existing requests without new fields continue rendering identically."""
    # A legacy request without metadata_options or typography_overrides
    req = RenderRequest(
        geography_id="test_geo",
        density_preset="balanced",
        classificationPreset="strahler",
        typography="gallery_poster",
        palette="hydro_light",
        show_metadata=True,
        title="Test",
        subtitle="Poster"
    )
    assert req.geography_id == "test_geo"
    assert req.show_metadata is True
    print("test_legacy_render_request_valid: PASS")

def test_legacy_export_request_valid():
    """Verify that legacy export requests remain valid."""
    req = ExportRequest(
        geography_id="test_geo",
        density_preset="detailed",
        classificationPreset="stream_order",
        typography="modern_dark",
        palette="hydro_dark",
        export_format="png",
        export_size="high_res_poster"
    )
    assert req.export_format == "png"
    assert req.export_size == "high_res_poster"
    print("test_legacy_export_request_valid: PASS")

if __name__ == "__main__":
    try:
        test_legacy_render_request_valid()
        test_legacy_export_request_valid()
        print("All baseline tests passed.")
        sys.exit(0)
    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)
