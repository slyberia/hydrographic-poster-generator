# Full Backend Suite Verification

- Result: pass
- Runtime: CPython 3.11.16, matching `backend/Dockerfile`
- Dependencies: `backend/requirements-dev.txt`
- CairoSVG: 2.7.1
- Cairo runtime: isolated project-local GTK extraction used only for testing
- Command scope: `backend/tests`

## Results

- 177 passed
- 3 skipped
- 0 failed
- 2 non-blocking warnings

The raster/PDF smoke test produced both PNG and PDF output before the suite
was run. The full test run therefore covers the CairoSVG tests that were
unavailable in the previously reused Python 3.14 environment.

The warnings were an upstream Starlette pending deprecation and pytest being
unable to write its optional cache directory. Neither warning prevented test
collection or execution.
