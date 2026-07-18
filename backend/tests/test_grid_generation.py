import pytest
import h3
from scripts.ingest_drone_data import (
    generate_h3_grid,
    select_region_feature,
)


def test_select_region_feature_success():
    """Verify select_region_feature matches the expected feature key/name."""
    geojson_data = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "Region 1"},
                "geometry": {"type": "Polygon", "coordinates": []}
            },
            {
                "type": "Feature",
                "properties": {"name": "Demerara-Mahaica"},
                "geometry": {"type": "Polygon", "coordinates": []}
            }
        ]
    }

    feat = select_region_feature(geojson_data, "guyana_region_4", "Demerara-Mahaica")
    assert feat["properties"]["name"] == "Demerara-Mahaica"


def test_select_region_feature_not_found():
    """Verify select_region_feature raises ValueError if no feature matches."""
    geojson_data = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "Region 1"},
                "geometry": {"type": "Polygon", "coordinates": []}
            }
        ]
    }

    with pytest.raises(ValueError, match="Could not find matching region"):
        select_region_feature(geojson_data, "guyana_region_4", "Demerara-Mahaica")


def test_generate_h3_grid_polygon():
    """Verify generate_h3_grid generates correct resolution-9 cells covering a simple polygon."""
    # Simple polygon covering a small area in Guyana
    geom = {
        "type": "Polygon",
        "coordinates": [
            [
                [-58.20, 6.75],
                [-58.10, 6.75],
                [-58.10, 6.85],
                [-58.20, 6.85],
                [-58.20, 6.75]
            ]
        ]
    }

    cells = generate_h3_grid(geom, 9)
    assert len(cells) > 0
    for cell in cells:
        assert h3.is_valid_cell(cell)
        assert h3.cell_to_parent(cell, 8) is not None
