# River-name country coverage

River names are optional inspection evidence. HydroRIVERS remains authoritative
for poster rendering and georeferencing QC. Each country is published as a
versioned, content-addressed OSM-derived display artifact only after a bounded
offline build; the browser lazy-loads it when names are enabled.

## Coverage states

| State | Release meaning |
| --- | --- |
| `verified` | Every independently selected target has an OSM source object and at least one confidently associated HydroRIVERS reach. |
| `partial` | Some targets pass, but at least one target is missing or does not clear matching thresholds. Available matches may be displayed with the country disclaimer. |
| `unavailable` | No target clears the release checks; the country must continue to return not evaluated. |

These states measure source-to-source association, not surveyed positional
accuracy or complete national river-name coverage.

## Phase 6 template

Each country directory contains:

- `build-profile.json`: geography identity, bounded target systems, aliases,
  queries, and an independent national reference;
- `source-record.json`: OSM objects and capture provenance;
- `evaluation.json`: per-target source objects, display segments, matched
  reaches, distance summaries, abstentions, and limitations;
- `manifest.json`: stable metadata pointing to an immutable SHA-256 artifact;
- `<sha256>.json`: OSM display geometry plus the lightweight
  HydroRIVERS-ID-to-name index.

The shared build command is:

```text
python scripts/build_river_name_artifact.py --country <slug>
```

The builder accepts only OSM waterway results typed as rivers or streams,
normalizes profile-defined aliases, verifies any explicitly sampled unnamed
waterways, and publishes no HydroRIVERS geometry. Nominatim and OSM are build
inputs only; runtime requests use packaged artifacts.

## Current measured coverage

### Guyana — verified pilot

Eight target systems pass the original pilot evaluation. The existing v1
artifact and URL remain unchanged for backward compatibility. See
`GUYANA_RIVER_NAMES.md`.

### Belize — partial

The evaluation scope uses Government of Belize National Hydrological Service
references. Seven of eight targets have both OSM source geometry and confidently
associated HydroRIVERS reaches:

- New River
- Belize River
- Mopan River
- Macal River
- Sibun River
- Moho River
- Sarstoon River

Rio Hondo remains explicitly unverified in this build because waterway-only OSM
discovery produced no qualifying source geometry and therefore no matched reach.
The released artifact contains 178 matched and 5 ambiguous reach associations.
The application reports Belize as `partial`; it does not fabricate a Rio Hondo
match or describe the country as fully verified.

Independent target references:

- Government of Belize, National Hydrological Service:
  https://naturalresources.gov.bz/index.php/faq-hydrology/
- Government of Belize flood report:
  https://naturalresources.gov.bz/wp-content/uploads/Flood-Forecast-June-20-2022.pdf

### Jamaica — partial

The first Phase 9 increment uses five bounded systems from the Jamaica Water
Resources Authority national plan: Great River, Montego River, Rio Grande, Rio
Cobre, and Black River. Four targets produced both qualifying OSM source
geometry and confidently associated HydroRIVERS reaches. Montego River remains
unverified in this build, so Jamaica is reported as `partial` rather than being
treated as nationally complete.

Independent target reference:

- Jamaica Water Resources Authority, *A National Water Resources Master Plan for
  Jamaica 2022*:
  https://www.wra.gov.jm/wp-content/uploads/2024/09/A-National-Water-Resources-Master-Plan-for-Jamaica-2022.pdf

### Costa Rica — verified

The first Phase 10 increment uses six bounded systems from the Comisión
Nacional de Emergencias de Costa Rica reference: Tempisque River, Tárcoles
River, Reventazón River, Pacuare River, Térraba River, and Sixaola River. All
six targets produced qualifying OSM source geometry and confidently associated
HydroRIVERS reaches in the bounded evaluation. This is source-to-source
agreement for the selected systems, not a claim of surveyed positional
accuracy or complete national river-name coverage.

Independent target reference:

- Comisión Nacional de Emergencias de Costa Rica, *Cuencas hidrográficas de
  Costa Rica*:
  https://www.cne.go.cr/CEDO-CRID/pdf/spa/doc934/doc934-b1.pdf

### Suriname — partial

The first Phase 11 increment uses the seven major rivers identified by the
Government of Suriname: Marowijne, Commewijne, Suriname, Saramacca, Coppename,
Nickerie, and Corantijn. Three targets produced qualifying OSM source geometry
and confidently associated HydroRIVERS reaches. Saramacca, Coppename, Nickerie,
and Corantijn produced no qualifying source object in this bounded build, so
Suriname is reported as `partial`; no missing matches are fabricated.

Independent target reference:

- Government of Suriname, *Strategic Environmental and Social Assessment for
  the Mining Sector of Suriname — Scoping Report*:
  https://gov.sr/wp-content/uploads/2023/03/Scoping-Report-FINAL-Incl-Appendix.pdf

## Adding another country

1. Select a bounded, representative target set from a national or similarly
   authoritative reference.
2. Add a country build profile using the existing production geography UUID.
3. Run the offline build and inspect every failed or unusually segmented target.
4. Retain `partial` or `unavailable` when evidence does not support
   `verified`.
5. Run checksum, route, frontend contract, and browser regressions.
6. Publish through normal code review; never query Nominatim at application
   runtime or add HydroRIVERS geometry to the artifact.

This makes expansion repeatable without implying that one country's thresholds
or source completeness automatically generalize to another.
