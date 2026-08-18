# Approved Baseline

- Phase: `drone-r4-public-safety-reference-data`
- Branch: `agent/curate-r4-public-safety-reference`
- Commit: `113b0c9a86506cc1587999ceac780a480f4f131d`
- Generated: `2026-08-18T16:38:42.209556+00:00`
- Failed commands: `1`
- Failed/error test cases: `0`

> Human approved on 2026-08-18. The recorded command failure was caused by the local Python environment not having pytest installed.

## Commands
### drone_reference_data_tests
- Exit code: `1`
- Duration: `0.039` seconds
- Command: `['python', '-m', 'pytest', 'backend/tests/test_feature_ingestion.py', 'backend/tests/test_drone_reference_layers.py', '-q']`
- Classification: `unclassified`
