# Reference inventory and classification

Scope: country registry, closeout state and CDN delivery setting. The dependency-search helper was run; excluding work matched the checkout's ancestor and yielded zero results. The scoped rg inventory below replaces that incomplete result.

Producers: seed_unevaluated_profiles.py and run_country_etl.py; authoritative persisted data: country_registry.json, profiles, manifest/artifact JSON and retained ETL output. Consumers: georef_country_pipeline.py, river_name_service.py, georef routes and frontend georefApi/GeorefMap. CDN configuration affects advertised URLs; no deployment dependency is changed. Tests consume those contracts; docs/roadmap consume the evidence.

```text
.agents/state/current_phase.json:3:  "phase_id": "georef-program-closeout",
.agents/state/current_phase.json:9:  "branch": "codex/georef-program-closeout",
.agents/state/current_phase.json:17:    ".agents/state/baselines/georef-program-closeout/**",
.agents/state/current_phase.json:18:    ".agents/state/verifications/georef-program-closeout/**",
.agents/state/current_phase.json:69:  "approved_baseline_file": ".agents/state/baselines/georef-program-closeout/baseline_approved.json",
.agents/state/georef_phase_roadmap.json:162:      "phase_id": "georef-program-closeout",
backend/app/services\georef_artifact_delivery.py:4:``GEOREF_ARTIFACT_CDN_BASE_URL`` is configured, manifests advertise the same
backend/app/services\georef_artifact_delivery.py:83:    base = os.getenv("GEOREF_ARTIFACT_CDN_BASE_URL", "").strip().rstrip("/")
backend/app/services\georef_country_pipeline.py:15:REGISTRY_PATH = DATA_ROOT / "country_registry.json"
backend/tests\test_georef_artifact_delivery.py:45:    monkeypatch.delenv("GEOREF_ARTIFACT_CDN_BASE_URL", raising=False)
backend/tests\test_georef_artifact_delivery.py:47:    monkeypatch.setenv("GEOREF_ARTIFACT_CDN_BASE_URL", "https://cdn.example.test/georef")
docs\GEOREFERENCING_PHASE_8_ARTIFACT_DELIVERY.md:9:`GEOREF_ARTIFACT_CDN_BASE_URL` makes manifests advertise the corresponding
scripts\seed_unevaluated_profiles.py:43:    registry_path = DATA / "country_registry.json"
```
