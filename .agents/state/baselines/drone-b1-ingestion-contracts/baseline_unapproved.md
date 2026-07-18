# Unapproved Baseline

- Phase: `drone-b1-ingestion-contracts`
- Branch: `drone-b1-ingestion-contracts`
- Commit: `92861daf8c2a00cf6db5ffa2ccb881a705027bd5`
- Generated: `2026-07-17T13:24:46.306979+00:00`
- Failed commands: `1`
- Failed/error test cases: `0`

> This baseline is not approved. Every failure is unclassified until human review.

## Commands
### contract_tests
- Exit code: `0`
- Duration: `0.784` seconds
- Command: `['.venv\\Scripts\\python', 'backend/tests/test_phase2a_baseline.py']`
- Classification: `not_applicable`

### ingestion_dry_run_test
- Exit code: `1`
- Duration: `2.159` seconds
- Command: `['.venv\\Scripts\\python', '-m', 'pytest', 'backend/tests/test_ingestion_dry_run.py', '-v']`
- Classification: `unclassified`
