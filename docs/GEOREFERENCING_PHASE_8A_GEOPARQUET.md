# Phase 8A — GeoParquet reusable data-product foundation

Phase 8A defines GeoParquet as the canonical reusable geospatial/AI artifact.
The writer uses GeoParquet 1.1 metadata, WKB geometry, EPSG:4326, deterministic
feature ordering, Zstandard compression, explicit provenance, and content hashes.

The browser is not required to parse GeoParquet. Browser delivery may use a
derived PMTiles/MVT artifact in a later delivery slice, while GeoJSON remains a
debug/export representation. The canonical artifact and browser artifact must
share the same source version and integrity metadata.

Build and compare an artifact with:

```text
python scripts/build_geoparquet.py --input <feature-collection.json> --output <country>.parquet --country Guyana --country-code GY --geography-id <uuid> --source-version <version>
python scripts/compare_geospatial_artifacts.py --input <feature-collection.json> --output comparison.json
```

FlatGeobuf and PMTiles/MVT are deliberately not production dependencies in this
foundation slice: FlatGeobuf is a possible interchange/streaming alternative,
while PMTiles/MVT is a tiled browser-delivery format. An analysis-only bakeoff
on the 58-feature packaged Guyana artifact measured 836,395 bytes for GeoJSON,
289,924 bytes for GeoParquet, 350,000 bytes for FlatGeobuf, and 2,405 bytes for
a single z0 MVT tile. The MVT result is a display-tile measurement, not a
complete PMTiles archive. GeoParquet is therefore the canonical reusable
artifact; MVT remains a derived browser-display candidate and FlatGeobuf an
interchange alternative.

No country expansion, database migration, runtime scraping, or raw source
dataset commit is part of Phase 8A.
