import pytest
import difflib
import os

GOLDEN_CASES = [
    {
        "name": "brazil_balanced",
        "geography_id": "<LOOKUP: Brazil admin_level=0>",
        "density_preset": "balanced",
    },
    {
        "name": "chile_balanced",
        "geography_id": "<LOOKUP: Chile admin_level=0>",
        "density_preset": "balanced",
    }
]

@pytest.mark.asyncio
async def test_golden_images():
    pytest.skip("Geography IDs not yet populated from database")
