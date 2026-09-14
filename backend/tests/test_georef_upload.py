import asyncio
import io
import subprocess
from pathlib import Path
from unittest.mock import patch

import pytest
from PIL import Image, PngImagePlugin

from app.services.georef_service import decode_image, png_bytes
from app.services.georef_upload import GeorefUploadGuard, raster_worker
from test_georef_routes import client


@pytest.mark.parametrize("format,mime", [("PNG", "image/png"), ("JPEG", "image/jpeg"), ("TIFF", "image/tiff")])
def test_real_types_and_filename_independence(format, mime):
    out = io.BytesIO()
    Image.new("RGB", (12, 12)).save(out, format=format)
    image, metadata = decode_image(out.getvalue(), mime)
    assert image.size == (12, 12)
    assert metadata is None


def test_rejects_misleading_mime():
    with pytest.raises(ValueError, match="declared"):
        decode_image(png_bytes(Image.new("RGB", (10, 10))), "image/jpeg")


@pytest.mark.parametrize("data", [b"", b"<svg/>", b"%PDF-1.0", b"\x89PNG\r\n\x1a\n", b"x" * (25 * 1024 * 1024 + 1)],
                         ids=["empty", "svg", "pdf", "truncated", "oversized"])
def test_malformed_and_oversized(data):
    with pytest.raises(ValueError):
        decode_image(data)


def test_pixels_dimensions_frames_metadata():
    with patch("app.services.georef_service.MAX_IMAGE_PIXELS", 50):
        with pytest.raises(ValueError, match="megapixel"):
            decode_image(png_bytes(Image.new("RGB", (10, 10))))
    with pytest.raises(ValueError, match="9000"):
        decode_image(png_bytes(Image.new("RGB", (9001, 1))))
    out = io.BytesIO()
    Image.new("RGB", (10, 10)).save(out, format="TIFF", save_all=True, append_images=[Image.new("RGB", (10, 10))])
    with pytest.raises(ValueError, match="single-frame"):
        decode_image(out.getvalue())
    out = io.BytesIO()
    info = PngImagePlugin.PngInfo()
    info.add_text("poster_manifest", "x" * 65537)
    Image.new("RGB", (10, 10)).save(out, format="PNG", pnginfo=info)
    with pytest.raises(ValueError, match="metadata"):
        decode_image(out.getvalue())


def test_worker_roundtrip_and_cleanup(tmp_path):
    with patch("tempfile.tempdir", str(tmp_path)):
        result, _ = raster_worker("decode", png_bytes(Image.new("RGB", (10, 20))), "image/png")
    assert result.size == (10, 20)
    assert list(tmp_path.iterdir()) == []


def test_worker_timeout_cleans_private_files(tmp_path):
    with patch("tempfile.tempdir", str(tmp_path)), patch("subprocess.run", side_effect=subprocess.TimeoutExpired("worker", 20)):
        with pytest.raises(ValueError, match="timed out"):
            raster_worker("decode", b"untrusted")
    assert list(tmp_path.iterdir()) == []


async def invoke(guard, headers=(), chunks=None, delay=0):
    messages = []
    chunks = iter(chunks or [b"test"])
    async def receive():
        if delay:
            await asyncio.sleep(delay)
        value = next(chunks, None)
        return {"type": "http.request", "body": value or b"", "more_body": value is not None}
    async def send(message):
        messages.append(message)
    await guard({"type": "http", "method": "POST", "path": "/georef/recover", "headers": headers}, receive, send)
    return messages


@pytest.mark.asyncio
async def test_admission_rejects_before_parser():
    calls = []
    async def app(scope, receive, send):
        calls.append(True)
    guard = GeorefUploadGuard(app)
    with patch("app.services.georef_upload.MAX_REQUEST_BYTES", 10):
        assert (await invoke(guard, [(b"content-length", b"11")]))[0]["status"] == 413
        assert (await invoke(guard, chunks=[b"123456", b"123456"]))[0]["status"] == 413
        assert (await invoke(guard, [(b"content-length", b"invalid")]))[0]["status"] == 400
        assert (await invoke(guard, [(b"content-encoding", b"gzip")]))[0]["status"] == 415
    assert calls == []
    assert guard.active == 0


@pytest.mark.asyncio
async def test_body_request_timeout_and_rate_concurrency():
    async def app(scope, receive, send):
        await asyncio.sleep(.05)
    guard = GeorefUploadGuard(app)
    with patch("app.services.georef_upload.BODY_SECONDS", .001):
        assert (await invoke(guard, delay=.02))[0]["status"] == 408
    with patch("app.services.georef_upload.REQUEST_SECONDS", .001):
        assert (await invoke(guard))[0]["status"] == 504
    guard.active = 2
    assert (await invoke(guard))[0]["status"] == 429
    guard.active = 0
    guard.tokens = 0
    assert (await invoke(guard))[0]["status"] == 429


def test_route_rejects_mime_and_oversized_options_before_saving(client):
    c, save = client
    image = png_bytes(Image.new("RGB", (10, 10)))
    response = c.post("/georef/recover", files={"image": ("../../secret.jpg", image, "image/jpeg")})
    assert response.status_code == 422
    assert "declared" in response.json()["detail"]
    response = c.post("/georef/recover", files={"image": ("x.png", image, "image/png")}, data={"options": "x" * 65537})
    assert response.status_code == 422
    save.assert_not_awaited()


def test_route_bounds_multipart_counts_and_preserves_contract(client):
    c, save = client
    image = png_bytes(Image.new("RGB", (10, 10)))
    response = c.post("/georef/recover", files=[
        ("image", ("a.png", image, "image/png")), ("extra", ("b.png", image, "image/png"))])
    assert response.status_code == 400
    response = c.post("/georef/recover", files={"image": ("a.png", image, "image/png")},
                      data={"options": "{}", "extra": "discard"})
    assert response.status_code == 400
    schema = c.get("/openapi.json").json()
    assert "multipart/form-data" in schema["paths"]["/georef/recover"]["post"]["requestBody"]["content"]
    save.assert_not_awaited()


def test_worker_admission_remains_bounded():
    from app.services.georef_upload import _worker_slots
    assert _worker_slots.acquire(False)
    assert _worker_slots.acquire(False)
    try:
        with pytest.raises(ValueError, match="busy"):
            raster_worker("decode", b"x")
    finally:
        _worker_slots.release()
        _worker_slots.release()
