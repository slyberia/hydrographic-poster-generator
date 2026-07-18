# Unapproved Baseline

- Phase: `phase-2d-ui-integration`
- Branch: `main`
- Commit: `92861daf8c2a00cf6db5ffa2ccb881a705027bd5`
- Generated: `2026-07-16T22:36:53.843854+00:00`
- Failed commands: `1`
- Failed/error test cases: `16`

> This baseline is not approved. Every failure is unclassified until human review.

## Commands
### phase2d_svg_renderer
- Exit code: `0`
- Duration: `2.486` seconds
- Command: `['python', '-m', 'pytest', 'backend/tests/test_svg_renderer.py', '-v']`
- Classification: `not_applicable`

### phase2d_layout_resolver
- Exit code: `0`
- Duration: `0.976` seconds
- Command: `['python', '-m', 'pytest', 'backend/tests/test_layout_resolver.py', '-v']`
- Classification: `not_applicable`

### phase2d_frontend_lint
- Exit code: `1`
- Duration: `11.111` seconds
- Command: `['npm.cmd', 'run', 'lint', '--', '-f', 'junit', '-o', 'lint-results.xml']`
- Classification: `unclassified`
