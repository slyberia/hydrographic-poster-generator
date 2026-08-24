import json
from pathlib import Path
import re

from app.config.flag_presets import (
    EXPECTED_FLAG_PRESET_IDS,
    FLAG_PRESETS,
    G20_COUNTRY_PRESET_BY_ISO3,
    POSTER_GEOGRAPHY_PRESET_BY_ISO3,
)
from app.services.presets_service import get_all_presets


TOKEN_KEYS = {
    "background",
    "feature_major",
    "feature_primary",
    "feature_secondary",
    "feature_minor",
    "feature_headwater",
    "text_primary",
    "text_secondary",
}
HEX_COLOR = re.compile(r"^#[0-9A-F]{6}$")


def test_flag_catalog_covers_dataset_and_g20_country_union():
    assert len(POSTER_GEOGRAPHY_PRESET_BY_ISO3) == 26
    assert len(G20_COUNTRY_PRESET_BY_ISO3) == 19
    assert set(POSTER_GEOGRAPHY_PRESET_BY_ISO3).isdisjoint(
        G20_COUNTRY_PRESET_BY_ISO3
    )
    assert len(EXPECTED_FLAG_PRESET_IDS) == 45
    assert set(FLAG_PRESETS) == EXPECTED_FLAG_PRESET_IDS
    names = [preset["name"] for preset in FLAG_PRESETS.values()]
    assert names == sorted(names)


def test_every_flag_has_complete_light_and_dark_tokens():
    for preset_id, preset in FLAG_PRESETS.items():
        assert preset["id"] == preset_id
        assert preset["name"]
        assert set(preset["variants"]) == {"light", "dark"}
        for tokens in preset["variants"].values():
            assert set(tokens) == TOKEN_KEYS
            assert all(HEX_COLOR.fullmatch(color) for color in tokens.values())
            assert tokens["background"] != tokens["feature_major"]
            assert tokens["text_primary"] != tokens["background"]


def test_existing_guyana_and_usa_tokens_remain_compatible():
    assert FLAG_PRESETS["guyana"]["variants"]["light"]["feature_major"] == "#CE1126"
    assert FLAG_PRESETS["guyana"]["variants"]["dark"]["background"] == "#111111"
    assert FLAG_PRESETS["usa"]["variants"]["light"]["feature_primary"] == "#0A3161"
    assert FLAG_PRESETS["usa"]["variants"]["dark"]["background"] == "#0A3161"


def test_migration_snapshot_matches_canonical_catalog():
    migration = (
        Path(__file__).resolve().parents[2]
        / "db"
        / "migrations"
        / "016_seed_flag_presets.sql"
    ).read_text(encoding="utf-8")
    marker = "$flag_presets$"
    catalog_json = migration.split(marker, 2)[1]
    payloads = json.loads(catalog_json)

    assert payloads == [
        FLAG_PRESETS[preset_id]
        for preset_id in sorted(FLAG_PRESETS)
    ]
    assert "ON CONFLICT (id) DO UPDATE" in migration
    assert "payload IS DISTINCT FROM EXCLUDED.payload" in migration


def test_typed_presets_response_exposes_every_flag():
    response = get_all_presets()
    serialized = response.model_dump()

    assert len(response.flags) == 45
    assert {preset.id for preset in response.flags} == EXPECTED_FLAG_PRESET_IDS
    assert len(serialized["flags"]) == 45
