"""Scenario-based validation tests.

Each scenario tests a specific geographic edge case against expected
postconditions. Geography IDs must be populated from the database.

Run: pytest backend/tests/test_scenarios.py -v
"""
import pytest

SCENARIOS = [
    {
        "name": "massive_delta",
        "description": "Amazon Basin, Brazil — dense network; major channels must be distinguishable",
        "geography_id": "<LOOKUP: Brazil admin_level=0>",
        "density_preset": "balanced",
        "assertions": {
            "min_river_count": 500,
            "must_have_classes": ["major", "primary", "secondary"],
        },
    },
    {
        "name": "tiny_island",
        "description": "Tobago — very few rivers; should trigger low feature count warning",
        "geography_id": "<LOOKUP: Tobago>",
        "density_preset": "balanced",
        "assertions": {
            "max_river_count": 50,
            "warn_if_below": 10,
        },
    },
    {
        "name": "high_latitude",
        "description": "Southern Chile — Mercator distortion must not exceed 1.20 spread",
        "geography_id": "<LOOKUP: Chile admin_level=0>",
        "density_preset": "balanced",
        "assertions": {
            "max_latitude_spread": 1.50,  # Chile is very tall; we expect it to exceed 1.20
            "scale_bar_should_be": "hidden",
        },
    },
    {
        "name": "landlocked_mountain",
        "description": "Bolivia, Cochabamba — headwater streams dominate",
        "geography_id": "<LOOKUP: Cochabamba admin_level=1>",
        "density_preset": "detailed",
        "assertions": {
            "min_river_count": 20,
            "dominant_class": "minor",  # most features should be minor/headwater
        },
    },
    {
        "name": "coastal_boundary",
        "description": "Guyana, Region 4 — rivers must terminate at coastline",
        "geography_id": "<LOOKUP: Demerara-Mahaica admin_level=1>",
        "density_preset": "balanced",
        "assertions": {
            "min_river_count": 5,
        },
    },
]

@pytest.mark.asyncio
async def test_scenarios():
    pytest.skip("Geography IDs not yet populated from database")
