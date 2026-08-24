# Country Flag Palette Catalog

## Coverage

The poster generator exposes 45 country-flag-inspired palettes:

- 26 Admin-0 geographies currently available from the production poster
  geography registry.
- 19 country members of the G20.

The European Union and African Union are G20 regional bodies, not countries,
and are not included. French Guiana is included because it is independently
available for poster generation; its palette uses the French tricolour.
Puerto Rico remains excluded until it is present in the production geography
registry and can actually produce a poster.

The dataset group is Antigua and Barbuda, Bahamas, Barbados, Belize, Costa
Rica, Cuba, Dominica, Dominican Republic, Ecuador, El Salvador, French Guiana,
Grenada, Guatemala, Guyana, Haiti, Honduras, Jamaica, Nicaragua, Panama,
Paraguay, Saint Kitts and Nevis, Saint Lucia, Saint Vincent and the Grenadines,
Suriname, Trinidad and Tobago, and Uruguay.

The G20 country group is Argentina, Australia, Brazil, Canada, China, France,
Germany, India, Indonesia, Italy, Japan, Mexico, Russia, Saudi Arabia, South
Africa, South Korea, Türkiye, the United Kingdom, and the United States.

## Canonical source and compatibility

`backend/app/config/flag_presets.py` is the canonical catalog. Each definition
contains representative national-flag colors. A deterministic resolver converts
those colors into the eight cartographic tokens used by the renderer for both
light and dark variants.

The existing `guyana` and `usa` identifiers and token values are preserved
exactly so saved browser sessions and previously generated output do not change
appearance.

The database remains authoritative when a preset category is present. If a
reachable database has no active rows for an entire category, `RulesService`
loads that category from the canonical Python registry. This prevents unrelated
density, palette, or typography rows from suppressing all flag presets before
migration 016 is deployed.

## Migration

`db/migrations/016_seed_flag_presets.sql` is generated from the canonical
registry:

```powershell
& '<project-python>' scripts/generate_flag_preset_migration.py
```

The migration inserts or updates `flag:<preset-id>` rows in
`public.platform_rules`. It uses `ON CONFLICT (id) DO UPDATE` and an
`IS DISTINCT FROM` guard, so repeated execution converges without rewriting
unchanged rows or advancing their `updated_at` timestamps.

The migration does not deactivate or remove custom flag rows.

Verify that the checked-in SQL matches the canonical registry with:

```powershell
& '<project-python>' scripts/generate_flag_preset_migration.py --check
```

## Adding a geography

When a new country becomes poster-generatable:

1. Add its ISO-3-to-preset mapping to
   `POSTER_GEOGRAPHY_PRESET_BY_ISO3`.
2. Add its name and representative flag colors to `FLAG_DEFINITIONS`.
3. Regenerate migration 016 while the phase is still unreleased, or create a
   new additive migration after migration 016 has shipped.
4. Run the backend catalog, migration-sync, frontend persistence, lint, and
   production-build checks.

Do not derive availability from a planned ingestion list. The coverage contract
tracks geographies that the running application can actually generate.

## Deployment sequence

1. Merge and deploy the backend/frontend revision.
2. Apply migration 016 to the active Supabase project.
3. Reload or restart the backend rule registry.
4. Verify `GET /presets` returns all 45 canonical IDs.
5. Select multiple flag presets and both variants in the live Studio, reload
   the page, and confirm the selection and preview persist.

Migration application, deployment, and production verification require separate
authorization and are not performed by this implementation phase.
