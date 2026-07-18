import pytest
from unittest.mock import MagicMock, AsyncMock, patch
import argparse
from scripts.ingest_drone_data import (
    validate_taxonomy_registry,
    FEATURE_MAPPINGS,
    calculate_checksum,
)


@pytest.mark.anyio
async def test_validate_taxonomy_registry_success():
    """Verify that validate_taxonomy_registry succeeds when all mapped layers and subtypes exist in DB."""
    mock_conn = AsyncMock()
    
    # Mock mcda_layers select return values: all mapped layers exist and are active
    mock_layers = [
        {"layer_id": 1, "layer_key": "guynode_schools_r4", "is_active": True},
        {"layer_id": 2, "layer_key": "osm_health_facilities", "is_active": True},
        {"layer_id": 3, "layer_key": "guynode_infrastructure", "is_active": True},
        {"layer_id": 4, "layer_key": "guynode_airports", "is_active": True},
        {"layer_id": 5, "layer_key": "guynode_protected_areas", "is_active": True},
    ]
    
    # Mock mcda_subtypes select return values: all mapped subtypes exist
    mock_subtypes = [
        {"subtype_id": 10, "subtype_key": "school"},
        {"subtype_id": 11, "subtype_key": "hospital"},
        {"subtype_id": 12, "subtype_key": "power"},
        {"subtype_id": 13, "subtype_key": "bridge"},
        {"subtype_id": 14, "subtype_key": "port"},
        {"subtype_id": 15, "subtype_key": "aerodrome_proximity"},
        {"subtype_id": 16, "subtype_key": "heliport_proximity"},
        {"subtype_id": 17, "subtype_key": "protected_area"},
    ]

    mock_conn.fetch.side_effect = lambda sql, *args: (
        mock_layers if "mcda_layers" in sql else mock_subtypes
    )

    layer_id_map, subtype_id_map = await validate_taxonomy_registry(mock_conn)

    assert len(layer_id_map) == 5
    assert len(subtype_id_map) == 8
    assert layer_id_map["guynode_schools_r4"] == 1
    assert subtype_id_map["school"] == 10


@pytest.mark.anyio
async def test_validate_taxonomy_registry_inactive_layer_fails():
    """Verify that validate_taxonomy_registry raises ValueError if a mapped layer is inactive."""
    mock_conn = AsyncMock()
    
    # Mock one layer as inactive (is_active = False)
    mock_layers = [
        {"layer_id": 1, "layer_key": "guynode_schools_r4", "is_active": False},
        {"layer_id": 2, "layer_key": "osm_health_facilities", "is_active": True},
        {"layer_id": 3, "layer_key": "guynode_infrastructure", "is_active": True},
        {"layer_id": 4, "layer_key": "guynode_airports", "is_active": True},
        {"layer_id": 5, "layer_key": "guynode_protected_areas", "is_active": True},
    ]
    
    mock_subtypes = [
        {"subtype_id": 10, "subtype_key": "school"},
        {"subtype_id": 11, "subtype_key": "hospital"},
        {"subtype_id": 12, "subtype_key": "power"},
        {"subtype_id": 13, "subtype_key": "bridge"},
        {"subtype_id": 14, "subtype_key": "port"},
        {"subtype_id": 15, "subtype_key": "aerodrome_proximity"},
        {"subtype_id": 16, "subtype_key": "heliport_proximity"},
        {"subtype_id": 17, "subtype_key": "protected_area"},
    ]

    mock_conn.fetch.side_effect = lambda sql, *args: (
        mock_layers if "mcda_layers" in sql else mock_subtypes
    )

    with pytest.raises(ValueError, match="Taxonomy validation failed"):
        await validate_taxonomy_registry(mock_conn)


@pytest.mark.anyio
async def test_validate_taxonomy_registry_missing_subtype_fails():
    """Verify that validate_taxonomy_registry raises ValueError if a mapped subtype is missing."""
    mock_conn = AsyncMock()
    
    mock_layers = [
        {"layer_id": 1, "layer_key": "guynode_schools_r4", "is_active": True},
        {"layer_id": 2, "layer_key": "osm_health_facilities", "is_active": True},
        {"layer_id": 3, "layer_key": "guynode_infrastructure", "is_active": True},
        {"layer_id": 4, "layer_key": "guynode_airports", "is_active": True},
        {"layer_id": 5, "layer_key": "guynode_protected_areas", "is_active": True},
    ]
    
    # Missing 'school' subtype key
    mock_subtypes = [
        {"subtype_id": 11, "subtype_key": "hospital"},
        {"subtype_id": 12, "subtype_key": "power"},
        {"subtype_id": 13, "subtype_key": "bridge"},
        {"subtype_id": 14, "subtype_key": "port"},
        {"subtype_id": 15, "subtype_key": "aerodrome_proximity"},
        {"subtype_id": 16, "subtype_key": "heliport_proximity"},
        {"subtype_id": 17, "subtype_key": "protected_area"},
    ]

    mock_conn.fetch.side_effect = lambda sql, *args: (
        mock_layers if "mcda_layers" in sql else mock_subtypes
    )

    with pytest.raises(ValueError, match="Taxonomy validation failed"):
        await validate_taxonomy_registry(mock_conn)
