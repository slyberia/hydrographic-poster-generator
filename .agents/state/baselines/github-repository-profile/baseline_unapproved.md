# Unapproved Baseline

- Phase: `github-repository-profile`
- Branch: `agent/github-repository-profile`
- Commit: `c3650f8544e926ddc216e708b2bee53bc776f0c4`
- Generated: `2026-08-20T20:26:45.731372+00:00`
- Failed commands: `1`
- Failed/error test cases: `0`

> This baseline is not approved. Every baseline requires manual human sign-off in baseline_review.md.

## Commands
### readme_profile_contract
- Exit code: `1`
- Duration: `0.087` seconds
- Command: `['C:\\Python314\\python.exe', '-c', 'from pathlib import Path; import re, sys; text=Path(\'README.md\').read_text(encoding=\'utf-8\'); required=[\'HPS Geospatial\',\'Drone Zoning\',\'Hydrographic Poster Generator\']; missing=[item for item in required if item not in text]; assets=re.findall(r\'(?:src=\\"|!\\[[^]]*\\]\\()([^\\"?)#]+\\.(?:png|webp|svg))\', text, flags=re.I); missing_assets=[asset for asset in assets if not asset.startswith((\'http://\',\'https://\')) and not Path(asset).exists()]; problems=[*(f\'missing identity: {item}\' for item in missing),*(f\'missing asset: {asset}\' for asset in missing_assets)]; print(\'README profile contract passed\' if not problems else \'\\n\'.join(problems)); sys.exit(1 if problems else 0)']`
- Classification: `unclassified`

### readme_diff_check
- Exit code: `0`
- Duration: `0.089` seconds
- Command: `['git', 'diff', '--check']`
- Classification: `not_applicable`
