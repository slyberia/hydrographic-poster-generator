import pytest
from app.models.layout_models import LayoutOverrides, ElementTransform
from app.services.layout_resolver import resolve_layout

def test_resolve_layout_clamps_legacy_transforms():
    legacy = {
        "title_block": {"x": 5000, "y": -6000, "scale": 15},
        "legend": {"x": -4000, "y": 6000, "scale": -1}
    }
    resolved = resolve_layout(legacy_transforms=legacy, overrides=None)
    
    assert resolved.title_block.x == 3600
    assert resolved.title_block.y == -5400
    assert resolved.title_block.scale == 10.0
    
    assert resolved.legend.x == -3600
    assert resolved.legend.y == 5400
    assert resolved.legend.scale == 0.1

def test_resolve_layout_clamps_overrides():
    overrides = LayoutOverrides(
        title_block=ElementTransform(x=5000, y=-6000, scale=15),
        legend=ElementTransform(x=-4000, y=6000, scale=0.0)
    )
    resolved = resolve_layout(legacy_transforms=None, overrides=overrides)
    
    assert resolved.title_block.x == 3600
    assert resolved.title_block.y == -5400
    assert resolved.title_block.scale == 10.0
    
    assert resolved.legend.x == -3600
    assert resolved.legend.y == 5400
    assert resolved.legend.scale == 0.1

def test_resolve_layout_valid_values_are_untouched():
    overrides = LayoutOverrides(
        title_block=ElementTransform(x=100, y=200, scale=1.5),
    )
    resolved = resolve_layout(legacy_transforms=None, overrides=overrides)
    assert resolved.title_block.x == 100
    assert resolved.title_block.y == 200
    assert resolved.title_block.scale == 1.5
