"""Content-addressed delivery helpers for georeferencing reference artifacts.

The packaged artifact remains the fallback of record. When
``GEOREF_ARTIFACT_CDN_BASE_URL`` is configured, manifests advertise the same
immutable object through that CDN without changing the artifact bytes or hash.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any
from urllib.parse import quote


IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable"
MANIFEST_CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=3600"
SCHEMA_VERSION = 1


def canonical_json_bytes(payload: Any) -> bytes:
    """Serialize JSON deterministically for hashing and reproducible builds."""
    return json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")


def sha256_hex(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def content_addressed_path(namespace: str, body: bytes, suffix: str = ".json") -> str:
    """Return a stable object path; callers must validate namespace/suffix."""
    if not namespace or "/" in namespace or "\\" in namespace:
        raise ValueError("Artifact namespace must be a single non-empty path component")
    if not suffix.startswith(".") or "/" in suffix or "\\" in suffix:
        raise ValueError("Artifact suffix must be a file extension")
    return f"{namespace}/{sha256_hex(body)}{suffix}"


def artifact_manifest(
    *,
    namespace: str,
    body: bytes,
    media_type: str = "application/json",
    packaged_path: str,
    object_path: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a manifest that can be served by a CDN or packaged fallback."""
    digest = sha256_hex(body)
    object_path = object_path or content_addressed_path(namespace, body)
    if digest not in object_path:
        raise ValueError("Object path must contain the artifact content hash")
    result: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "artifact": {
            "namespace": namespace,
            "object_path": object_path,
            "packaged_path": packaged_path,
            "sha256": digest,
            "byte_size": len(body),
            "media_type": media_type,
            "cache_control": IMMUTABLE_CACHE_CONTROL,
        },
    }
    if metadata:
        result["metadata"] = metadata
    return result


def verify_artifact(body: bytes, manifest: dict[str, Any]) -> None:
    artifact = manifest.get("artifact", {})
    expected = artifact.get("sha256")
    if not isinstance(expected, str) or sha256_hex(body) != expected:
        raise ValueError("Artifact checksum does not match its manifest")
    byte_size = artifact.get("byte_size")
    if not isinstance(byte_size, int) or len(body) != byte_size:
        raise ValueError("Artifact byte size does not match its manifest")


def cdn_url(object_path: str) -> str | None:
    base = os.getenv("GEOREF_ARTIFACT_CDN_BASE_URL", "").strip().rstrip("/")
    if not base:
        return None
    return f"{base}/{quote(object_path, safe='/')}"


def delivered_artifact_url(manifest: dict[str, Any], fallback_url: str) -> str:
    object_path = manifest.get("artifact", {}).get("object_path")
    if isinstance(object_path, str):
        return cdn_url(object_path) or fallback_url
    return fallback_url


def packaged_artifact(path: Path, manifest: dict[str, Any]) -> bytes:
    """Read and verify the packaged fallback before it is served."""
    body = path.read_bytes()
    verify_artifact(body, manifest)
    return body
