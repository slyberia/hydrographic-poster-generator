# Audit verification

Run from the repository root:

```text
python scripts/verify_georef_program_closeout.py --output .agents/state/verifications/georef-program-closeout/inventory_audit.json
python work/check_program_closeout_audit.py
```

Recorded results on 2026-09-14:

- Inventory: pass_with_documented_limitations; zero integrity/accounting errors.
- Determinism: two audit invocations produce equal report objects.
- Wrong SHA-256: injected Guyana hash mismatch is detected.
- Wrong reach count: injected manifest count mismatch is detected.
- Undocumented withholding: marking a withheld artifact as published is detected.
- Mutation safety: only in-memory function return values were patched; source artifacts were not modified.

The scratch fault-injection script is not committed. Its reproducible body follows; save under work/check_program_closeout_audit.py and run from the root. This is a checker test, not an application behavior test.

```python
"""Local fault-injection checks for the closeout auditor; never mutate artifacts."""
import copy
import importlib.util
import json
from pathlib import Path
from unittest.mock import patch

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("closeout_audit", root / "scripts/verify_georef_program_closeout.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
first, second = module.audit(), module.audit()
assert first == second and not first["errors"]
original_fingerprint = module.fingerprint
def wrong_hash(path):
    record = original_fingerprint(path)
    if path.name == "476fa0c1ef9daa64b65d86965e0288b79007d6187180a7e9f7589e8a80574429.json":
        record["sha256"] = "0" * 64
    return record
with patch.object(module, "fingerprint", wrong_hash):
    assert "guyana: sha256" in module.audit()["errors"]
original_read = module.read
def wrong_count(path):
    record = original_read(path)
    if path == module.DATA / "guyana/manifest.json":
        record = copy.deepcopy(record)
        record["artifact"]["indexed_reach_count"] += 1
    return record
with patch.object(module, "read", wrong_count):
    assert "guyana: indexed_reach_count" in module.audit()["errors"]
def wrong_withholding(path):
    record = original_read(path)
    if path.name == "unevaluated-21-etl.json":
        record = copy.deepcopy(record)
        next(row for row in record["countries"] if row["slug"] == "atg")["published"] = True
    return record
with patch.object(module, "read", wrong_withholding):
    assert "Undocumented missing manifest: atg" in module.audit()["errors"]
print("PASS: deterministic repeat, SHA-256 mismatch detection, reach-count mismatch detection, and undocumented withholding detection; no artifacts modified.")
```
