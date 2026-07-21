import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app.models.clip_models import ClipResult, ClipMetadata

from app.database import get_repository
from app.repository.river_repository import RiverRepository

@pytest.fixture
def client():
    # Create a mock repository
    mock_repo = MagicMock(spec=RiverRepository)
    mock_repo.pool = AsyncMock()
    
    # Override dependencies
    app.dependency_overrides[get_repository] = lambda: mock_repo

    with patch("app.main.db.connect", new_callable=AsyncMock), \
         patch("app.main.db.disconnect", new_callable=AsyncMock), \
         patch("app.services.rules_service.RulesService.load", new_callable=AsyncMock), \
         patch("app.main.RiverRepository.check_readiness", new_callable=AsyncMock) as mock_check:
        
        mock_check.return_value = True
        
        with TestClient(app) as test_client:
            yield test_client
            
    # Cleanup overrides
    app.dependency_overrides.clear()

@pytest.fixture
def mock_clip_result():
    return ClipResult(
        type="FeatureCollection",
        features=[],
        metadata=ClipMetadata(
            geography_name="Test",
            region_code="T",
            river_count=10,
            classification_status="done"
        )
    )

def test_cors_exposes_download_and_manifest_headers():
    """The frontend is a different origin, so these response headers are only
    readable in the browser when CORS explicitly exposes them (allow_headers
    governs request headers, not response exposure). Regression guard for the
    export download filename + poster manifest headers."""
    from fastapi.middleware.cors import CORSMiddleware

    cors = next(
        (m for m in app.user_middleware if m.cls is CORSMiddleware), None
    )
    assert cors is not None, "CORSMiddleware not configured"
    exposed = cors.kwargs.get("expose_headers", [])
    assert "Content-Disposition" in exposed
    assert "X-Export-Manifest" in exposed


def test_preview_endpoint(client, mock_clip_result):
    with patch("app.routers.preview.ClippingService.clip_rivers", new_callable=AsyncMock) as mock_clip, \
         patch("app.routers.preview.SVGRenderer") as mock_renderer_class:
         
        mock_clip.return_value = mock_clip_result
        mock_renderer_instance = mock_renderer_class.return_value
        mock_renderer_instance.generate_svg.return_value = "<svg></svg>"
        
        response = client.post("/preview", json={
            "geography_id": "test_geo",
            "density_preset": "dense",
            "classification_preset": "strahler",
            "palette": "dark",
            "typography": "modern",
            "title": "Test Map",
            "subtitle": "A subtitle"
        })
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/svg+xml"
        
        # Verify clip_rivers was called with the correct 4 arguments
        mock_clip.assert_called_once()
        kwargs = mock_clip.call_args.kwargs
        assert kwargs["geography_id"] == "test_geo"
        assert kwargs["density_preset_id"] == "dense"
        assert kwargs["classification_preset_id"] == "strahler"
        
        # Verify SVGRenderer was initialized with correct canvas
        mock_renderer_class.assert_called_once()
        _, kwargs = mock_renderer_class.call_args
        assert kwargs["canvas"] == (2400, 3600)
        
        # Verify generate_svg was called with clip_result
        mock_renderer_instance.generate_svg.assert_called_once_with(mock_clip_result)

def test_debug_sensitivity_endpoint(client, mock_clip_result):
    with patch("app.routers.debug.ClippingService.clip_rivers", new_callable=AsyncMock) as mock_clip, \
         patch("app.routers.debug.SVGRenderer") as mock_renderer_class, \
         patch("app.routers.debug.rules_service") as mock_rules:
         
        mock_clip.return_value = mock_clip_result
        mock_renderer_instance = mock_renderer_class.return_value
        mock_renderer_instance.generate_svg.return_value = "<svg></svg>"
        
        # Setup mock base density
        mock_base_density = MagicMock()
        mock_base_density.min_stream_order = 5
        mock_base_density.classification_map = {}
        # Make model_copy return a usable object
        mock_copy = MagicMock()
        mock_copy.classification_map = {}
        mock_base_density.model_copy.return_value = mock_copy
        
        mock_rules.get_density_preset.return_value = mock_base_density
        mock_rules._density = {}
        
        response = client.post("/debug/sensitivity", json={
            "geography_id": "test_geo",
            "density_preset": "dense",
            "classification_preset": "strahler",
            "palette": "dark",
            "typography": "modern",
            "title": "",
            "subtitle": ""
        })
        
        assert response.status_code == 200
        
        # Called 3 times for the 3 variants (base, minus_1, plus_1)
        assert mock_clip.call_count == 3
        
        # Verify clip_rivers was called with the correct 4 arguments (especially classification_preset_id)
        for call_args in mock_clip.call_args_list:
            kwargs = call_args.kwargs
            assert kwargs["geography_id"] == "test_geo"
            assert kwargs["classification_preset_id"] == "strahler"
            assert "temp_debug" in kwargs["density_preset_id"]
            
        # Verify SVGRenderer was initialized with canvas=(1000, 1000)
        assert mock_renderer_class.call_count == 3
        for call_args in mock_renderer_class.call_args_list:
            _, kwargs = call_args
            assert kwargs["canvas"] == (1000, 1000)
            
        # Verify generate_svg called 3 times
        assert mock_renderer_instance.generate_svg.call_count == 3

def test_export_endpoint(client, mock_clip_result):
    with patch("app.routers.export.ClippingService.clip_rivers", new_callable=AsyncMock) as mock_clip, \
         patch("app.routers.export.ExportService.export") as mock_export, \
         patch("app.routers.export.AuditService.queue_audit_log") as mock_audit:
         
        mock_clip.return_value = mock_clip_result
        mock_export.return_value = (b"<svg></svg>", "image/svg+xml", "export.svg")
        
        response = client.post("/export", json={
            "geography_id": "test_geo",
            "density_preset": "dense",
            "classification_preset": "strahler",
            "palette": "dark",
            "typography": "modern",
            "title": "Test",
            "subtitle": "",
            "export_mode": "poster",
            "export_size": "digital_poster",
            "export_format": "svg"
        })
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/svg+xml"
        assert response.content == b"<svg></svg>"
        
        # Verify export service called correctly
        mock_export.assert_called_once()
        args = mock_export.call_args.args
        assert args[0] == mock_clip_result
