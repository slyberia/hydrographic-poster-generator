import json
import io
import xml.etree.ElementTree as ET
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_repository
from app.services.georef_service import build_manifest, render_poster, png_bytes
from test_georef_pipeline import network, request
from PIL import Image
import pytest


@pytest.fixture
def client():
    repo = MagicMock()
    repo.pool = MagicMock()
    app.dependency_overrides[get_repository] = lambda: repo
    with (
        patch("app.main.db.connect", new_callable=AsyncMock),
        patch("app.main.db.disconnect", new_callable=AsyncMock),
        patch("app.services.rules_service.RulesService.load", new_callable=AsyncMock),
        patch(
            "app.repository.georef_repository.GeorefRepository.check_readiness",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch(
            "app.routers.georef.ClippingService.clip_rivers",
            new_callable=AsyncMock,
            return_value=network(),
        ),
        patch(
            "app.repository.georef_repository.GeorefRepository.save",
            new_callable=AsyncMock,
        ) as save,
        TestClient(app) as client,
    ):
        yield client, save
    app.dependency_overrides.clear()


def test_native_route_has_qc_and_metadata(client):
    c, save = client
    response = c.post("/georef/native", json=request().model_dump(mode="json"))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["qc"]["status"] == "passed"
    assert body["geotiff_base64"] and body["preview_base64"]
    save.assert_awaited_once()


def test_embedded_provenance_upload_through_real_recovery(client):
    c, save = client
    clip = network()
    req = request()
    m = build_manifest(clip, req)
    image = png_bytes(render_poster(clip, req), m)
    response = c.post(
        "/georef/recover", files={"image": ("poster.png", image, "image/png")}
    )
    assert response.status_code == 200, response.text
    assert response.json()["qc"]["status"] == "passed"
    assert len(response.json()["gcps"]) >= 12
    save.assert_awaited_once()


def test_missing_provenance_is_actionable(client):
    c, save = client
    image = png_bytes(Image.new("RGBA", (500, 500), "white"))
    response = c.post(
        "/georef/recover", files={"image": ("poster.png", image, "image/png")}
    )
    assert response.status_code == 422
    assert "Select the source" in response.json()["detail"]
    save.assert_not_awaited()


def test_invalid_upload_and_perspective_option_rejected(client):
    c, _ = client
    assert (
        c.post(
            "/georef/recover", files={"image": ("bad.png", b"invalid", "image/png")}
        ).status_code
        == 422
    )
    response = c.post(
        "/georef/recover",
        files={"image": ("bad.png", b"invalid", "image/png")},
        data={"options": json.dumps({"transform": "projective"})},
    )
    assert response.status_code == 422


def test_database_failure_does_not_claim_persistence(client):
    c, save = client
    save.side_effect = RuntimeError("database unavailable")
    with pytest.raises(RuntimeError):
        c.post("/georef/native", json=request().model_dump(mode="json"))


def test_missing_schema_fails_readiness_before_processing(client):
    c, save = client
    with patch(
        "app.repository.georef_repository.GeorefRepository.check_readiness",
        new_callable=AsyncMock,
        return_value=False,
    ):
        assert c.get("/georef/readiness").status_code == 503
        assert (
            c.post("/georef/native", json=request().model_dump(mode="json")).status_code
            == 503
        )
    save.assert_not_awaited()


@pytest.mark.parametrize("format", ["png", "svg"])
def test_existing_exports_embed_matching_lightweight_provenance(client, format):
    c, save = client
    req = request().model_copy(update={"export_format": format})
    with patch("app.routers.export.AuditService.queue_audit_log"):
        response = c.post("/export", json=req.model_dump(mode="json"))
    assert response.status_code == 200, response.text
    if format == "png":
        with Image.open(io.BytesIO(response.content)) as image:
            manifest = json.loads(image.info["poster_manifest"])
    else:
        root = ET.fromstring(response.content)
        metadata = root.find("{http://www.w3.org/2000/svg}metadata")
        assert metadata is not None
        manifest = json.loads(metadata.text)
    assert manifest["poster_id"] == response.headers["X-Poster-ID"]
    assert manifest["hydro_rivers_reference"]["geometry_in_manifest"] is False
    save.assert_awaited_once()
