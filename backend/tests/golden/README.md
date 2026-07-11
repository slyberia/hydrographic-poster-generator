# Golden Image Baselines

This directory stores reference SVG outputs for visual regression testing.

## Workflow
1. Run `pytest backend/tests/test_golden.py --update-golden` to generate/update baselines.
2. Run `pytest backend/tests/test_golden.py` to compare current output against baselines.
3. Any diff > 0 bytes triggers a test failure with a report of changed elements.

## Baseline Files
- `golden_brazil_balanced.svg`
- `golden_chile_balanced.svg`
- (etc.)
