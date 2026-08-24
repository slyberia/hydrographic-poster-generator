import pytest

from app.config.flag_presets import FLAG_PRESETS
from app.services.rules_service import RulesService


class FakeConnection:
    def __init__(self, rows):
        self.rows = rows

    async def fetch(self, _query):
        return self.rows


class FakeAcquire:
    def __init__(self, rows):
        self.connection = FakeConnection(rows)

    async def __aenter__(self):
        return self.connection

    async def __aexit__(self, _exc_type, _exc, _traceback):
        return False


class FakePool:
    def __init__(self, rows):
        self.rows = rows

    def acquire(self):
        return FakeAcquire(self.rows)


@pytest.mark.asyncio
async def test_database_load_falls_back_only_for_entirely_missing_categories():
    service = RulesService()
    rows = [
        {
            "id": "density:database-only",
            "rule_type": "density",
            "version": 7,
            "payload": {
                "id": "database-only",
                "name": "Database only",
                "min_stream_order": 4,
                "description": "Database authority fixture",
                "classification_map": {"4": "minor"},
            },
        }
    ]

    await service.load(FakePool(rows))

    assert service.source == "database+hardcoded"
    assert set(service._density) == {"database-only"}
    assert len(service._flags) == 45
    assert set(service._flags) == set(FLAG_PRESETS)
    assert service.rule_versions == {"density:database-only": 7}


@pytest.mark.asyncio
async def test_database_flag_category_remains_authoritative_when_present():
    service = RulesService()
    rows = [
        {
            "id": "flag:guyana",
            "rule_type": "flag",
            "version": 3,
            "payload": FLAG_PRESETS["guyana"],
        }
    ]

    await service.load(FakePool(rows))

    assert service.source == "database+hardcoded"
    assert set(service._flags) == {"guyana"}
    assert service.rule_versions == {"flag:guyana": 3}


@pytest.mark.asyncio
async def test_reload_clears_stale_database_rules_before_replacement():
    service = RulesService()
    first = {
        "id": "flag:guyana",
        "rule_type": "flag",
        "version": 1,
        "payload": FLAG_PRESETS["guyana"],
    }
    second = {
        "id": "flag:usa",
        "rule_type": "flag",
        "version": 2,
        "payload": FLAG_PRESETS["usa"],
    }

    await service.load(FakePool([first]))
    await service.reload(FakePool([second]))

    assert set(service._flags) == {"usa"}
    assert service.rule_versions == {"flag:usa": 2}
