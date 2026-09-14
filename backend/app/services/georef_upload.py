"""Admission before multipart parsing and killable raster workers.

Limits are per application process. Public edge/global rate policy is a
deployment concern, not provided by this middleware.
"""
import asyncio
import io
import pickle
import subprocess
import sys
import tempfile
import time
import threading
from pathlib import Path

from starlette.responses import JSONResponse
from fastapi.routing import APIRoute

MAX_REQUEST_BYTES = 26 * 1024 * 1024
BODY_SECONDS = 30
REQUEST_SECONDS = 120
WORKER_SECONDS = {"decode": 20, "recover": 85}
_worker_slots = threading.BoundedSemaphore(2)


class BoundedUploadRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()
        async def bounded(request):
            if request.method == "POST" and request.url.path.rstrip("/") == "/georef/recover":
                # Populate Request's form cache with strict counts before FastAPI
                # binds the unchanged UploadFile/Form contract. Context cleanup
                # also covers validation/dependency failures.
                async with request.form(max_files=1, max_fields=1):
                    return await handler(request)
            return await handler(request)
        return bounded


class UploadRejected(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


class GeorefUploadGuard:
    def __init__(self, app):
        self.app = app
        self.active = 0
        self.tokens = 30.0
        self.updated = time.monotonic()

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path", "").rstrip("/") != "/georef/recover" or scope["method"] != "POST":
            return await self.app(scope, receive, send)
        now = time.monotonic()
        self.tokens = min(30.0, self.tokens + (now - self.updated) / 2)
        self.updated = now
        if self.active >= 2 or self.tokens < 1:
            return await JSONResponse({"detail": "Georeferencing is busy. Please retry shortly."}, 429,
                                      headers={"Retry-After": "2"})(scope, receive, send)
        self.tokens -= 1
        self.active += 1
        started = False
        async def track_send(message):
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)
        try:
            headers = dict(scope.get("headers", []))
            if headers.get(b"content-encoding", b"identity").lower() != b"identity":
                raise UploadRejected(415, "Compressed upload requests are not supported.")
            if b"content-length" in headers:
                try:
                    length = int(headers[b"content-length"])
                except ValueError:
                    raise UploadRejected(400, "Invalid upload length.")
                if length < 0 or length > MAX_REQUEST_BYTES:
                    raise UploadRejected(413, "Upload request exceeds 26 MB.")
            # Cap the complete request before Starlette creates multipart temporary files.
            body = io.BytesIO()
            deadline = time.monotonic() + BODY_SECONDS
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise UploadRejected(408, "Upload timed out.")
                try:
                    message = await asyncio.wait_for(receive(), remaining)
                except asyncio.TimeoutError:
                    raise UploadRejected(408, "Upload timed out.")
                if message["type"] == "http.disconnect":
                    return
                chunk = message.get("body", b"")
                if body.tell() + len(chunk) > MAX_REQUEST_BYTES:
                    raise UploadRejected(413, "Upload request exceeds 26 MB.")
                body.write(chunk)
                if not message.get("more_body", False):
                    break
            body.seek(0)
            async def replay():
                chunk = body.read(64 * 1024)
                return {"type": "http.request", "body": chunk, "more_body": body.tell() < body.getbuffer().nbytes}
            try:
                await asyncio.wait_for(self.app(scope, replay, track_send), REQUEST_SECONDS)
            except asyncio.TimeoutError:
                raise UploadRejected(504, "Georeferencing timed out. Try a smaller image.")
            finally:
                body.close()
        except UploadRejected as error:
            if not started:
                await JSONResponse({"detail": error.message}, error.status)(scope, receive, send)
        finally:
            self.active -= 1


def raster_worker(operation, *args):
    # Thread work may outlive a disconnected/cancelled request. Its admission
    # slot remains held until the child exits, independently of ASGI cancellation.
    if not _worker_slots.acquire(blocking=False):
        raise ValueError("Image processing is busy. Please retry shortly.")
    try:
        return _raster_worker(operation, *args)
    finally:
        _worker_slots.release()


def _raster_worker(operation, *args):
    """Only trusted application objects are pickled, never deserialized uploads.

    A unique private temporary directory is removed on success, decode failure,
    timeout and worker crash. Client filenames never become filesystem paths.
    """
    if operation not in WORKER_SECONDS:
        raise ValueError("Unknown raster operation")
    with tempfile.TemporaryDirectory(prefix="hydro-georef-") as directory:
        root = Path(directory)
        from app.services.rules_service import rules_service
        # The child uses the exact loaded registry, including database overrides.
        registry = {key: getattr(rules_service, key) for key in
                    ("_density", "_palette", "_typography", "_flags", "_source", "_rule_versions")}
        (root / "input").write_bytes(pickle.dumps((args, registry), protocol=pickle.HIGHEST_PROTOCOL))
        try:
            subprocess.run(
                [sys.executable, "-m", "app.services.georef_upload", operation, directory],
                check=True, timeout=WORKER_SECONDS[operation],
                cwd=Path(__file__).resolve().parents[2],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
        except subprocess.TimeoutExpired as exc:
            raise ValueError("Image processing timed out. Try a smaller image.") from exc
        except subprocess.CalledProcessError as exc:
            raise ValueError("Unable to process the uploaded image.") from exc
        success, value = pickle.loads((root / "output").read_bytes())
        if not success:
            raise ValueError(value)
        return value


def _worker():
    operation, directory = sys.argv[1:]
    root = Path(directory)
    # Linux adds a hard address-space ceiling; Windows retains byte, pixel,
    # concurrency and killable wall-time limits.
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (3 * 1024**3, 3 * 1024**3))
    except ImportError:
        pass
    args, registry = pickle.loads((root / "input").read_bytes())
    from app.services.rules_service import rules_service
    for key, value in registry.items():
        setattr(rules_service, key, value)
    try:
        if operation == "decode":
            from PIL import PngImagePlugin
            PngImagePlugin.MAX_TEXT_CHUNK = 65536
            PngImagePlugin.MAX_TEXT_MEMORY = 65536
            from app.services.georef_service import decode_image
            value = decode_image(*args)
        elif operation == "recover":
            from app.services.georef_recovery import recover_result
            value = recover_result(*args)
        else:
            raise ValueError("Unknown raster operation")
        result = (True, value)
    except ValueError as exc:
        result = (False, str(exc))
    except Exception:
        result = (False, "Unable to process the uploaded image.")
    (root / "output").write_bytes(pickle.dumps(result, protocol=pickle.HIGHEST_PROTOCOL))


if __name__ == "__main__":
    _worker()
