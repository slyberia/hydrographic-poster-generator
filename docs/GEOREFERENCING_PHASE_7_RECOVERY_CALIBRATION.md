# Phase 7 recovery calibration

Phase 7 establishes a repeatable, independently evaluated Recovery benchmark for Guyana, Belize, and Jamaica. The benchmark retains numeric results and recipe metadata only; generated raster derivatives are discarded in memory.

Supported cases include unchanged, rotation, resize, crop, JPEG degradation, anisotropic scaling, affine shear, and combined degradation. Unsupported projective distortion and wrong-source cases are negative cases: acceptance is recorded as a false accept and rejection as a fail-closed result.

Each run reports successful-recovery rate, false accepts, false rejects, per-case runtime, peak traced Python memory, independent transform error in uploaded-image pixels, and failure reasons. It explicitly separates:

- source-network agreement: independent raster-to-source comparison;
- registration accuracy: independent transform error against procedural truth;
- surveyed absolute accuracy: not measured without surveyed ground control;
- physical capture validation: not measured by procedural simulations alone.

The initial exit targets are zero false accepts for wrong-source and unsupported-projective cases, at least 95% success across supported transformations, and accepted-case independent p95 error no greater than eight uploaded-image pixels. Results that do not justify calibration retain the existing provisional thresholds.
