import sys
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

@pytest.fixture(autouse=True)
def load_hardcoded_rules():
    from app.services.rules_service import rules_service
    rules_service._load_from_hardcoded()
