# Unapproved Baseline

- Phase: `drone-b3-osm-features`
- Branch: `drone-b3-osm-features`
- Commit: `92861daf8c2a00cf6db5ffa2ccb881a705027bd5`
- Generated: `2026-07-17T21:21:20.832816+00:00`
- Failed commands: `1`
- Failed/error test cases: `0`

> This baseline is not approved. Every failure is unclassified until human review.

## Commands
### contract_tests
- Exit code: `0`
- Duration: `0.436` seconds
- Command: `['.venv\\Scripts\\python', 'backend/tests/test_phase2a_baseline.py']`
- Classification: `not_applicable`

### grid_generation_test
- Exit code: `0`
- Duration: `1.969` seconds
- Command: `['.venv\\Scripts\\python', '-m', 'pytest', 'backend/tests/test_grid_generation.py', '-v']`
- Classification: `not_applicable`

### feature_ingestion_test
- Exit code: `1`
- Duration: `2.25` seconds
- Command: `['.venv\\Scripts\\python', '-m', 'pytest', 'backend/tests/test_feature_ingestion.py', '-v']`
- Classification: `unclassified`
