# Data Ingestion Pipeline

This document details the boundary source evaluation, the HydroRIVERS data mapping, and usage instructions for the ingestion scripts.

## Boundary Source Evaluation

Before implementing the boundary import pipeline, we evaluated **geoBoundaries** and **GADM**.

| Criteria | geoBoundaries | GADM |
|---|---|---|
| **Admin levels** | ADM0, ADM1, ADM2 ✅ | ADM0–ADM5 ✅ |
| **Coverage** | Global ✅ | Global ✅ |
| **Licensing** | CC BY 4.0 (open, attribution) ✅ | Non-commercial academic use only ⚠️ |
| **Format** | GeoJSON, shapefile | GeoPackage, shapefile |
| **Hierarchy** | Standardized ISO codes, clean linkage | Country-specific, sometimes inconsistent |

**Recommendation: geoBoundaries**
We chose geoBoundaries because the CC BY 4.0 license is unambiguous for a product that might become public, and its per-country download options are cleaner for building a targeted MVP pipeline without massive file bloat. GADM's strict non-commercial restriction represents a significant risk for the project's future.

---

## Field Mappings

### HydroRIVERS Mapping

Based on the official HydroSHEDS v1.0 documentation, the following fields from the HydroRIVERS shapefiles are mapped to the `hydro_rivers` PostGIS schema:

| Source Field (Shapefile) | Target Schema Field | Notes |
|---|---|---|
| `HYRIV_ID` | `hydrorivers_id` | Primary unique ID in source |
| `ORD_STRA` | `stream_order` | Strahler stream order (1-10) |
| `UP_AREA_SQKM` / `UPLAND_SKM` | `upstream_area` | Upstream drainage area in km² (field name varies by release) |
| `LENGTH_KM` | `length_km` | Length of river segment in km |
| *(Derived)* | `region_code` | Passed via CLI (e.g. `south_america`) |
| *(Derived)* | `source_dataset` | Defaults to `hydrorivers` |
| *(Derived)* | `display_class` | Placeholder classification (calculated later) |
| *(Derived)* | `source_version` | e.g. `1.0` |

### geoBoundaries Mapping

| Source Field | Target Schema Field | Notes |
|---|---|---|
| `shapeName` | `name` | Human-readable name |
| `shapeISO` | `country_code` | ISO 3166-1 alpha-3 code |
| `shapeGroup` | `country` | Often matches country name |
| *(Derived)* | `admin_level` | Passed via CLI (0, 1, 2) |
| *(Derived)* | `parent_id` | Linked during import via geometry/name |
| *(Derived)* | `region_code` | Passed via CLI |

---

## Ingestion Scripts

### Prerequisites

The ingestion scripts are written in Python and require **GDAL/Fiona**. Since GDAL can be complex to install natively on Windows, these scripts are designed to be run either:
1. In a Linux-based Docker container (recommended).
2. Via WSL (Windows Subsystem for Linux).
3. Via a Conda environment on Windows (`conda install -c conda-forge fiona`).

Install Python dependencies:
```bash
pip install -r scripts/requirements-scripts.txt
```

### Environment Variables

Ensure your `.env` file (or `.env.local`) has a valid PostGIS connection:
```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

### Importing HydroRIVERS

```bash
python scripts/import_hydrorivers.py <path/to/hydrorivers.shp> <region_code>
```
Example:
```bash
python scripts/import_hydrorivers.py ./data/raw/HydroRIVERS_v10_sa.shp south_america
```

**Note on File Geodatabases (`.gdb`):** 
Fiona supports `.gdb` if compiled with the `OpenFileGDB` driver. If you encounter driver errors, use QGIS or `ogr2ogr` to convert the `.gdb` to a shapefile or GeoPackage first.

### Importing Boundaries

```bash
python scripts/import_boundaries.py <path/to/boundary.shp> <admin_level> <region_code>
```
Example:
```bash
python scripts/import_boundaries.py ./data/raw/geoBoundaries-COL-ADM1.shp 1 south_america
```
