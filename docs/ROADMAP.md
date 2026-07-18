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

### 🟡 Phase 3: Metadata Migration (Next Step)
- **Granular UI Controls**: Build frontend UI checkboxes to replace the single master `show_metadata` toggle.
- **Wiring**: Map these toggles directly to the backend's new `MetadataOptions` Pydantic model (`show_title`, `show_subtitle`, `show_north_arrow`, `show_scale_bar`, `show_data_credits`).
- **QA Integration**: Update the pre-flight QA checklist to evaluate and reflect metadata visibility states.

### 🔵 Phase 4: Typography Foundation (Pending)
- **Advanced UI Selectors**: Implement font family pickers, weight selectors, and letter-spacing tracking sliders on the frontend.
- **Overrides**: Wire the controls to construct and send the `TypographyOverrides` object to the backend.
- **Customization Limits**: Validate that typography adjustments respect bounds defined in the backend's `TypographyOverrides` models.

### 🔵 Phase 5: Composition Hardening (Pending)
- **Parity Verification**: Systematically audit the interactive canvas preview against PDF, PNG, and SVG exports to ensure exact layout, scaling, and scaling-factor parity.
- **Client Resilience**: Ensure the application recovers gracefully from malformed geometry, database connection dropouts, or network timeouts.
- **State Migration Verification**: Validate client local storage migrations on page load (V1 settings to V2).

### 🔵 Phase 6: UI Rollout (Pending)
- **Feature Flags**: Clean up and align the frontend feature flags (`typography_customization`, `granular_metadata_controls`, `manual_layout_editing`) to map strictly to production-ready UI toggles.
- **Polish & Accessibility**: Conduct complete keyboard/pointer interaction audits, screen reader checks (ARIA attributes), and responsive layout testing across device break-points.
- **Production Deploy**: Roll out the final version to Cloud Run and mark the integration complete.

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
