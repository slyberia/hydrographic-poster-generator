import os
import sys
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Must be set before any test module imports app.main: the debug router is
# only mounted when this is enabled (production default is off), and the
# admin router requires a configured key.
os.environ.setdefault("ENABLE_DEBUG_ENDPOINTS", "1")
os.environ.setdefault("ADMIN_API_KEY", "test-admin-key")

@pytest.fixture(autouse=True)
def load_hardcoded_rules():
    from app.services.rules_service import rules_service
    rules_service._load_from_hardcoded()
