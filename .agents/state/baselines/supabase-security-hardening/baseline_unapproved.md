# Unapproved Baseline

- Phase: `supabase-security-hardening`
- Branch: `agent/supabase-security-hardening`
- Commit: `1b44e709923662b1c31896210f51b00606b517e4`
- Generated: `2026-08-24T11:32:40.726906+00:00`
- Failed commands: `0`
- Failed/error test cases: `0`

> This baseline is not approved. Every baseline requires manual human sign-off in baseline_review.md.

## Commands
### backend_security_regression_tests
- Exit code: `0`
- Duration: `4.226` seconds
- Command: `['C:\\Users\\kyleg\\Documents\\Codex\\hydrographic-poster-generator-milestone-d-clean\\.venv\\Scripts\\python.exe', '-m', 'pytest', '-p', 'no:cacheprovider', 'backend/tests/test_auth.py', 'backend/tests/test_drone_publication.py', 'backend/tests/test_feature_ingestion.py', '-q']`
- Classification: `not_applicable`

### diff_check
- Exit code: `0`
- Duration: `0.149` seconds
- Command: `['git', 'diff', '--check']`
- Classification: `not_applicable`
