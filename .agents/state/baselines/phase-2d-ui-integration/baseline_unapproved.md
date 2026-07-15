# Unapproved Baseline

- Phase: `phase-2d-ui-integration`
- Branch: `feature/phase-2d-ui-integration`
- Commit: `8d79e7658c4022ed834e7acd898701e1251fbde3`
- Generated: `2026-07-15T20:53:46.265634+00:00`
- Failed commands: `1`
- Failed/error test cases: `15`

> This baseline is not approved. Every failure is unclassified until human review.

## Commands
### phase2d_svg_renderer
- Exit code: `0`
- Duration: `1.725` seconds
- Command: `['python', '-m', 'pytest', 'backend/tests/test_svg_renderer.py', '-v']`
- Classification: `not_applicable`

### phase2d_layout_resolver
- Exit code: `0`
- Duration: `1.591` seconds
- Command: `['python', '-m', 'pytest', 'backend/tests/test_layout_resolver.py', '-v']`
- Classification: `not_applicable`

### phase2d_frontend_lint
- Exit code: `1`
- Duration: `10.038` seconds
- Command: `['npm.cmd', 'run', 'lint', '--', '-f', 'junit', '-o', 'lint-results.xml']`
- Classification: `unclassified`
