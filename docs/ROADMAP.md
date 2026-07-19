# Project Roadmap: Hydrographic Poster Generator MVP

> [!NOTE]
> **July 2026 Redesign Shift:** 
> The project roadmap has pivoted from the original sequence to address critical production export issues, PgBouncer database connection pooling limits, and a structured migration towards advanced cartographic customization (manual layout controls, typography customizers, and granular metadata toggles). 
> 
> The active phases below outline this redesigned path, while the original MVP roadmap is preserved at the bottom for historical context.

---

## 🗺️ Active Roadmap (Redesign & Integration)

This active sequence ensures backend contract safety, backward compatibility for legacy clients, and a staged rollout of new user-facing controls.

### 🟢 Phase 0: Export Hotfix (Completed)
- **Database Pooling**: Implemented `statement_cache_size=0` on `asyncpg` to resolve PgBouncer statement caching issues.
- **Export Engine**: Stabilized CairoSVG rasterization and resolved memory leaks/connection pooling limits during high-res exports.
- **Parity**: Ensured rendering engine parity between the FastAPI preview and file export systems.

### 🟢 Phase 1: Style Migration (Completed)
- **Styling Refactor**: Unified backend styling by migrating legacy `palette` and `custom_colors` fields into the new `StyleSelection` and `PalettePreset` structures.
- **Backward Compatibility**: Maintained validation support to auto-translate legacy payload requests into V2 objects under the hood.

### 🟢 Phase 2: Backend Cartographic Contracts (Completed)
- **Pydantic Validation**: Deployed strict validation models (`extra="forbid"`) and resolvers for:
  - **Layout Overrides**: Element-specific offset (x/y) and scale controls.
  - **Granular Metadata**: Independent toggles for title, subtitle, legend, scale bar, north arrow, and data credits.
  - **Typography Overrides**: Configurable font family, weight, and tracking options.
- **Integration**: Wired resolvers into the `/preview` and `/export` SVG rendering pipelines.
- **Local Verification**: Cleaned TypeScript compilation errors in frontend builds and updated dynamic CORS origin mapping.

### 🟢 Phase 3: Metadata Migration (Completed)
- **Granular UI Controls**: Six `show_*` checkboxes replace the single master `show_metadata` toggle (`frontend/src/components/ControlPanel.tsx`, Layers section).
- **Wiring**: Toggles map to the backend `MetadataOptions` model via `metadata_options` in the render payload (`frontend/src/lib/api.ts`); payload fidelity is pinned by `frontend/e2e/studio-parity.spec.ts`.
- **QA Integration**: The pre-flight QA checklist reads metadata visibility states (`frontend/src/lib/qa.ts` text-fit check honors `show_title`/`show_subtitle`).

### 🟢 Phase 4: Typography Foundation (Completed)
- **Advanced UI Selectors**: Font family, weight, and tracking selectors live under "Advanced Customization" (`ControlPanel.tsx`).
- **Overrides**: Controls build the `typography_overrides` object (`frontend/src/lib/settings.ts`); changing the base preset resets overrides. E2E-pinned in `studio-parity.spec.ts`.
- **Customization Limits**: Values come from fixed option lists mirroring the backend `TypographyOverrides` model.

### 🟢 Phase 5: Composition Hardening (Completed)
- **Parity Verification**: `backend/tests/test_render_parity.py` asserts preview-path and export-path SVG are byte-identical through the shared `SVGRenderer` across a settings matrix (metadata toggles, typography overrides, layout overrides, design-asset mode), plus PNG dimension and PDF page-box structural checks. Client-side, `frontend/e2e/studio-parity.spec.ts` asserts the canvas transform math and control state reach the payload exactly.
  - *Method limit*: parity is renderer-level plus payload fidelity — rasters are not pixel-diffed. One manual visual pass on a live stack is the final gate (see `docs/DEPLOYMENT.md` §5 rollout checklist).
- **Client Resilience**: `frontend/e2e/studio-resilience.spec.ts` injects backend 500s, network failures, malformed SVG, and export failures; the client surfaces friendly errors and recovers (fixes in `frontend/src/lib/api.ts` and `InteractiveCanvas.tsx`).
- **State Migration Verification**: V1→V2 localStorage migration and garbage-state fallback are e2e-verified end to end.

### 🟡 Phase 6: UI Rollout (Code complete — deploy pending owner checklist)
- **Feature Flags**: All flags removed (`frontend/src/lib/features.ts` deleted); the granular metadata, typography customization, and manual layout UIs are unconditional. Legacy payload fields (`show_metadata`, `palette`, `element_transforms`) and the V1→V2 migration are retained for back-compat.
- **Polish & Accessibility**: Keyboard/ARIA audit automated in `frontend/e2e/studio-a11y.spec.ts` (tab order, accessible names, keyboard operability, status/live regions); label associations and live-region roles added. Judgment-call items (contrast, screen-reader nuance) are listed in the phase completion report.
- **Production Deploy**: Owner-executed via the "Final rollout checklist" in `docs/DEPLOYMENT.md` §5 — not run from the sandbox.

---

## 📜 Historical Document: Original MVP Roadmap (Deprecated)

*Preserved for documentation and context on the project's foundational phases.*

### 🟢 Phase 1: Foundation (Completed)
- **Repository & Governance**: Git setup, AI agent rulebooks (`AGENTS.md`, `CLAUDE.md`), and the strict command ledger orchestration pipeline.
- **Database Schema**: PostGIS `hydro_rivers` and `admin_boundaries` tables deployed to Supabase.
- **Data Ingestion**: Python CLI scripts (`import_hydrorivers.py`, `import_boundaries.py`) created for parsing shapefiles/GDBs. Raw source data downloaded locally.
- **Frontend Scaffold**: Next.js 15+ App Router initialized with Tailwind CSS, securely connected to the Supabase cloud instance.

### 🟢 Phase 2: The Data Reality Check (Completed)
- Ingestion of raw spatial data into the Supabase database.
- Boundaries configured for Admin 0, Admin 1, and Admin 2 levels.
- HydroRIVERS data imported and validated via spatial indices.

### 🟢 Phase 3: FastAPI Backend (Spatial Service) (Completed)
- FastAPI application established.
- Hierarchical boundaries endpoint (`GET /geographies`) and clipping processing endpoint (`POST /clip`) wired.
- Simplification and stream order preset engine implemented.

### 🟢 Phase 4: SVG Renderer (The Map Generator) (Completed)
- Cartographic rendering system built for background and river paths.
- Title blocks, subtitles, legends, and scale bars rendered.

### 🟢 Phase 5: Export Pipeline (Completed)
- Integration of CairoSVG for PDF/PNG/SVG exports.
- Output presets (digital poster, print poster, instagram format) implemented.

### 🟢 Phase 6: Frontend Control Panel & UI (Completed)
- Baseline Next.js UI for preset selectors, text fields, and preview canvas.

### 🟢 Phase 7: Deployment & Hardening (Completed)
- Packaging with Docker, deploying to Cloud Run, and establishing the build pipeline.
