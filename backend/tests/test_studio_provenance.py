from unittest.mock import AsyncMock, patch
import json
import pytest
from app.services.studio_provenance import attach_provenance, verify_provenance
from app.services.georef_service import build_manifest, render_poster, png_bytes
from test_georef_pipeline import network, request
from test_georef_routes import client


def test_hash_manifest_binds_all_fields_and_bytes():
    manifest = build_manifest(network(), request())
    supplied = attach_provenance(manifest, b"poster")
    assert verify_provenance(supplied, manifest, b"poster") == manifest
    for key in supplied:
        with pytest.raises(ValueError, match="does not match"):
            verify_provenance({**supplied, key: "tampered"}, manifest, b"poster")
    with pytest.raises(ValueError):
        verify_provenance(supplied, manifest, b"other poster")
    with pytest.raises(ValueError, match="unavailable"):
        verify_provenance(supplied, None, b"poster")


def test_export_emits_and_persists_authoritative_digest(client):
    c, save = client
    response = c.post("/export", json=request().model_dump(mode="json"))
    assert response.status_code == 200, response.text
    supplied = json.loads(response.headers["X-Studio-Provenance"])
    stored = save.call_args.args[0]
    assert verify_provenance(supplied, stored, response.content) == stored
    assert supplied["poster_id"] == response.headers["X-Poster-ID"]


def test_transfer_provenance_verified_by_real_recovery(client):
    c, save = client
    clip, req = network(), request()
    manifest = build_manifest(clip, req)
    payload = png_bytes(render_poster(clip, req), manifest)
    supplied = attach_provenance(manifest, payload)
    with patch("app.repository.georef_repository.GeorefRepository.get_manifest", new_callable=AsyncMock, return_value=manifest):
        response = c.post("/georef/recover", files={"image": ("poster.png", payload, "image/png")},
                          data={"options": json.dumps({"poster_id": str(manifest.poster_id), "studio_provenance": supplied})})
        assert response.status_code == 200, response.text
        assert response.json()["studio_provenance_status"] == "verified_server_manifest"
        tampered = {**supplied, "renderer_version": "tampered"}
        response = c.post("/georef/recover", files={"image": ("poster.png", payload, "image/png")},
                          data={"options": json.dumps({"studio_provenance": tampered})})
        assert response.status_code == 422
