# Phase 8 — reference artifact architecture and delivery

Phase 8 establishes a storage-neutral delivery contract for small, immutable
georeferencing reference artifacts. Every artifact is canonicalized, addressed
by its SHA-256 digest, described by a manifest, served with one-year immutable
caching, and retained as a packaged fallback.

The application uses the packaged route when no CDN is configured. Setting
`GEOREF_ARTIFACT_CDN_BASE_URL` makes manifests advertise the corresponding
content-addressed object under that base URL; the bytes and checksum do not
change. A CDN or GCS upload is an operational publication step, not a second
source of truth.

## Contract

- Stable manifests are short-lived and may be revalidated.
- Content-addressed objects use `Cache-Control: public, max-age=31536000, immutable`.
- The manifest records SHA-256, byte size, media type, object path, and packaged fallback path.
- Packaged artifacts are checksum- and size-verified before serving.
- Existing local routes remain valid when storage or CDN configuration is absent.

Build a deterministic artifact with:

```text
python scripts/build_georef_artifact.py --input <json> --output-dir <directory> --namespace <name>
```

Phase 8 does not select the canonical GeoParquet representation; that decision
belongs to Phase 8A. It also does not expand country coverage, change the
database schema, scrape at runtime, or commit raw source datasets.
