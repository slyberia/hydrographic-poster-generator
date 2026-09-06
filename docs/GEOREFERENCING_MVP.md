# Georeferencing MVP

Implemented execution units 1–4: Native export/validation, metadata persistence,
Recovery v1, and procedural evaluation. No new accounts, OAuth, saved-image
library, projective transforms, or AI matching service.

## Using it

- In Studio, choose **GEOTIFF** in the export format selector
  and download. The result panel shows a source overlay and measured QC, with
  downloadable GeoTIFF, manifest, and report.
- Open **Georeference** to upload a PNG, JPEG, or TIFF. New PNG exports carry
  embedded provenance. Alternatively supply its poster UUID or manifest JSON.
- For legacy images, select the source country/administrative region and density.
  API callers can also supply the original render settings. Matching assumes the
  current renderer/presets; substantial restyling may need explicit control points.
- Optional control-point JSON is an array of 12–200 pairs containing `source_x`,
  `source_y` (EPSG:3857) and `pixel_x`, `pixel_y` (uploaded-image pixel edges).
  Points must be visible and well distributed. A deterministic subset is withheld
  before fitting. Downloaded GCPs refer to the **cropped output**; add the QC
  `input_crop` origin before reusing those coordinates against the original upload.

## Manifest and coordinate contract

`PosterGeospatialManifest` schema version 2 contains a poster UUID, timestamp,
generator/dataset/boundary provenance, source geography/region, source CRS and
bounds, map-frame crop, export dimensions, full request settings, resolved colors,
rule versions, and render transform. Source records are identified by the existing
`hydro_rivers.hydrorivers_id` field, geography/density filter, count, and sorted-ID
SHA-256. Geometry is never copied into the manifest.

The source database is EPSG:4326. The existing clipping/rendering flow projects
to EPSG:3857; `geographic_to_pixel.crs` explicitly identifies this transform input.
It is not an affine mapping directly from longitude/latitude. Bounds in both CRSs
are retained when supplied by the existing clip metadata.

Let `A` map EPSG:3857 coordinates to full-poster pixel-edge coordinates. It composes
the existing projector, river-group layout translation/scale, and export scaling.
The same canvas selection is shared with the existing SVG/PNG/PDF exporter.
For a native map crop starting at `(left, top)`, the GeoTIFF transform is
`inverse(A) * translation(left, top)`. TIFF pixels are areas: upper-left edge `(0,0)`,
first center `(0.5,0.5)`. PNG/SVG provenance embeds the full-poster transform, not
the cropped TIFF transform. TIFFs contain their own raster transform plus manifest/QC tags.

Recovery estimates a similarity or affine canonical-to-upload transform `B`.
Its TIFF transform is `inverse(A) * inverse(B) * translation(crop_x, crop_y)`.
The recovered map-frame polygon controls transparency. Rotated/sheared TIFFs
retain an affine geotransform; no extra resampling/warp is required.

## Recovery and validation

Recovery renders a canonical river-only image from the source geometry. Palette
coverage masks are converted to distance ribbons for stable SIFT landmarks.
Mutual ratio-tested matches feed RANSAC, with at least 12 correspondences, six
training inliers, three withheld points, spatial coverage and stability checks.
Similarity is preferred when its independent network score is comparable to affine.
This is classical image registration, not a hosted AI model.

QC independently rasterizes source HydroRIVERS geometry with Rasterio and compares
it to detected ink in the actual output. It reports precision/recall/F1, displacement
median/RMSE/p95/max, source coverage, and (for Recovery) fit and withheld residuals.
All withheld residuals are reported, alongside a verified subset and rejection count.
Distances use a local azimuthal-equidistant CRS, not uncorrected Mercator metres.
The preview uses blue source / orange observed / white overlap.

Current thresholds are **provisional**: F1 at least 0.85 passes; 0.60–0.85 requires
review; lower scores fail. Network matching has a three-pixel tolerance at a
maximum 1600-pixel QC dimension. A passing score is not a probability, a surveyed
accuracy guarantee, or proof that every pixel is within three original-image pixels.
Nearest-ink displacement is affected by line width, raster resolution, and sampling.
Blank images, insufficient/clustered/collinear points, unsupported transforms,
and failed network validation return an error without a misleading TIFF.

## API and resource bounds

- `GET /georef/readiness`: checks required metadata columns; 503 if unavailable.
- `GET /georef/manifests/{poster_id}`: retrieve a known UUID; no listing endpoint.
- `POST /georef/native`: existing `ExportRequest` JSON.
- `POST /georef/recover`: multipart `image` and JSON-string `options`.
  Options include `manifest`, `poster_id`, `geography_id`, `density_preset`,
  `classification_preset`, `render_settings`, `gcps`, `transform` (`auto`,
  `similarity`, `affine`). Conflicting identity/source metadata is rejected.
- Successful processing returns manifest, QC, GCPs, base64 TIFF/preview, filename.
- Existing `/export` accepts `geotiff` and returns a binary TIFF. Existing PNG/SVG
  downloads embed manifests. All formats expose `X-Poster-ID`; PDF provenance can
  be retrieved through that UUID.

Uploads: 25 MiB, 40 megapixels, maximum 9000-pixel side; metadata: 64 KiB.
The interactive georef endpoints allow two concurrent processing requests per
worker and return 429 when occupied. This is not a distributed quota/rate limiter.
Browser cancellation stops waiting; CPU work already running may finish server-side.
No application-managed image files or Supabase Storage objects are created;
multipart temporary spools are closed, and intermediate rasters remain in memory.
Downloaded samples/test fixtures are explicit local deliverables, not a hosted corpus.
Assess worker memory, request size/time limits, and ingress abuse controls before
public deployment, especially for high-resolution posters. Deployment is not part
of this execution unit.

## Supabase persistence

Apply `db/migrations/015_georeferencing_mvp.sql` before enabling the updated backend.
It adds only `poster_manifest`, `georef_runs`, and `georef_gcps`, with foreign keys
and lookup indexes. All three have RLS enabled and no anon/authenticated privileges.
The backend's existing database connection performs atomic manifest/run/GCP writes;
no browser service key, new identity system, or geometry table is introduced.
Accepted runs are retained; rejected requests do not create a success record.
Database write failures propagate rather than reporting successful persistence.

The anonymous manifest lookup behaves as a UUID capability, not an authenticated
private library. Do not place secrets/personal information in poster provenance.
RLS-with-no-policy advisor notices are intentional for these backend-only tables.
An example manifest occupied 1856 bytes in PostgreSQL (excluding indexes).
No automatic retention/deletion policy is added; monitor metadata growth as usage grows.

Rollback: revert the application changes and leave these additive tables intact
to preserve provenance. Do not drop them merely to roll back application code.

## Repeatable evaluation

Install backend requirements plus the repository's development/test dependencies.
Cairo system libraries are required as in the existing backend Dockerfile. Run from
the repository root with both the root and `backend` available on `PYTHONPATH`:

```text
python -m pytest backend/tests -q
python scripts/benchmark_georef.py --request request.json --output results.json
python scripts/benchmark_georef.py --request request.json --clip clip.json --output offline-results.json
```

The live benchmark uses the existing `DATABASE_URL` and rule loader. Offline mode
uses an explicit `ClipResult` snapshot and built-in rules. Request JSON uses the
existing `ExportRequest` contract. The runner refuses to overwrite a report.

Eight recipes cover unchanged, 17°/90° rotation, resize, anisotropic resize, crop,
JPEG compression, and combined degradation. Ground truth is never supplied to
registration: a separate visible 9×9 grid measures recovered-transform error.
Only recipes, source identity, transforms and numeric results are retained.

2026-09-05 baseline: eight of eight cases passed on a deterministic synthetic
network and eight of eight on 81 real Jamaica HydroRIVERS features. Jamaica p95
grid error ranged from 0.03 to 5.55 uploaded pixels; the anisotropic case was the
largest. This small baseline is not global calibration. Expand across regions,
densities, colors, layouts and severe degradation before setting production SLAs.

`frontend/e2e/georef.spec.ts` is an opt-in integration suite (`GEOREF_INTEGRATION=1`)
requiring a configured frontend/API and a Jamaica poster fixture. It exercises
upload, QC, downloads, recoverable errors, phone layout, and native Studio export.
The local verification harness uses real source/processing with in-memory
persistence; live Supabase SQL round trips were verified separately. A deployed
browser-to-production-database acceptance test is still a release step.
