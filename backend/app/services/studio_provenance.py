"""Tamper evidence anchored in the existing immutable server manifest record.

This is a server-verified digest manifest, not a portable digital signature.
No image is stored; the artifact hash covers the final exported bytes.
"""
import hashlib
import hmac
import json


def config_hash(manifest):
    data = {
        "render_settings": manifest.render_settings,
        "source": manifest.source,
        "reference": manifest.hydro_rivers_reference,
        "transform": manifest.geographic_to_pixel.model_dump(mode="json"),
        "renderer_version": manifest.generator["version"],
    }
    return hashlib.sha256(json.dumps(data, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def provenance_for(manifest):
    return {
        "version": 1,
        "poster_id": str(manifest.poster_id),
        "configuration_sha256": config_hash(manifest),
        "artifact_sha256": manifest.generator.get("artifact_sha256"),
        "renderer_version": manifest.generator["version"],
        "source_version": manifest.source.get("dataset_version", manifest.source.get("rivers")),
        "issued_at": manifest.generated_at.isoformat(),
        "verification": "server_manifest",
    }


def attach_provenance(manifest, payload):
    manifest.generator["artifact_sha256"] = hashlib.sha256(payload).hexdigest()
    return provenance_for(manifest)


def verify_provenance(supplied, stored, payload):
    if stored is None or not stored.generator.get("artifact_sha256"):
        raise ValueError("Studio provenance is unavailable. Upload manually without the transfer metadata.")
    expected = provenance_for(stored)
    if supplied != expected or not hmac.compare_digest(
        hashlib.sha256(payload).hexdigest(), expected["artifact_sha256"]
    ):
        raise ValueError("Studio provenance does not match this image or its server record. Prepare the poster again.")
    return stored
