import PosterHeader from "@/components/PosterHeader";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const NAV_ITEMS = [
  ["overview", "Overview"],
  ["architecture", "Architecture"],
  ["quick-start", "Quick start"],
  ["render", "Render"],
  ["export", "Export"],
  ["presets", "Presets"],
  ["errors", "Errors and limits"],
  ["glossary", "Glossary"],
  ["schema", "Interactive schema"],
];

const PIPELINE = [
  ["01", "Resolve", "Load the selected boundary and preset definitions."],
  ["02", "Clip", "Intersect HydroRIVERS line geometries in PostGIS."],
  ["03", "Classify", "Map river hierarchy into display classes."],
  ["04", "Compose", "Generate the poster through the shared SVG renderer."],
  ["05", "Deliver", "Return preview SVG or convert the export."],
];

const PREVIEW_REQUEST = `curl -X POST "$API_BASE/preview" \\
  -H "Content-Type: application/json" \\
  -d '{
    "geography_id": "<admin_0_id>",
    "density_preset": "balanced",
    "classification_preset": "standard",
    "style": {
      "schema_version": 2,
      "mode": "standard",
      "preset_id": "abyss",
      "overrides": {}
    },
    "typography": "gallery_poster",
    "title": "FLOWING GUYANA",
    "subtitle": "River Network of Guyana",
    "metadata_options": {
      "show_title": true,
      "show_subtitle": true,
      "show_legend": true,
      "show_north_arrow": true,
      "show_scale_bar": true,
      "show_data_credits": true
    }
  }' \\
  --output preview.svg`;

const EXPORT_REQUEST = `curl -X POST "$API_BASE/export" \\
  -H "Content-Type: application/json" \\
  -d '{
    "geography_id": "<admin_0_id>",
    "density_preset": "balanced",
    "classification_preset": "standard",
    "style": {
      "schema_version": 2,
      "mode": "standard",
      "preset_id": "abyss",
      "overrides": {}
    },
    "typography": "gallery_poster",
    "title": "FLOWING GUYANA",
    "subtitle": "River Network of Guyana",
    "export_format": "png",
    "export_size": "high_res_poster"
  }' \\
  --output poster.png`;

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-[#31405b] bg-[#172033] p-4 text-[13px] leading-6 text-[#dce8f5]">
      <code>{children}</code>
    </pre>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="mb-3 text-xs font-bold uppercase text-[var(--ui-action)]">
        {eyebrow}
      </p>
      <h2
        className="text-3xl font-semibold text-[var(--ui-text)]"
        style={{
          fontFamily: "var(--font-playfair), 'Playfair Display', serif",
        }}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 leading-relaxed text-[var(--ui-text-muted)]">
          {description}
        </p>
      )}
    </div>
  );
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[var(--ui-page)] text-[var(--ui-text)]">
      <PosterHeader current="docs" />

      <section className="border-b border-[var(--ui-border)] bg-[var(--ui-panel)] px-5 py-14 sm:px-8 sm:py-18">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-xs font-bold uppercase text-[#b4234f]">
            Poster API
          </p>
          <h1
            className="max-w-[17ch] text-4xl font-semibold leading-[1.08] sm:text-5xl"
            style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', serif",
            }}
          >
            Build with the Hydro Poster rendering pipeline.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[var(--ui-text-muted)]">
            Resolve supported geographies and presets, render an SVG preview,
            then export the same composition as SVG, PNG, or PDF.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16 lg:py-20">
        <aside className="hidden lg:block">
          <nav
            aria-label="Documentation sections"
            className="sticky top-24 border-l border-[var(--ui-border-strong)] pl-5"
          >
            <p className="mb-4 text-xs font-bold uppercase text-[var(--ui-text-muted)]">
              On this page
            </p>
            <ul className="space-y-3 text-sm">
              {NAV_ITEMS.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="text-[var(--ui-text-muted)] transition-colors hover:text-[var(--ui-action)]"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0">
          <nav
            aria-label="Documentation sections"
            className="mb-12 overflow-x-auto border-y border-[var(--ui-border)] py-3 lg:hidden"
          >
            <ul className="flex min-w-max gap-5 text-sm">
              {NAV_ITEMS.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="text-[var(--ui-text-muted)] hover:text-[var(--ui-action)]"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <section id="overview" className="scroll-mt-24 pb-16">
            <SectionHeading
              eyebrow="Overview"
              title="A constrained spatial rendering API."
              description="The API supports the same poster workflow as the Studio. It operates on registered regional HydroRIVERS data and named geoBoundaries records; it is not a general-purpose GIS service or arbitrary data-upload endpoint."
            />
            <dl className="mt-9 grid border-y border-[var(--ui-border)] sm:grid-cols-3">
              <div className="border-b border-[var(--ui-border)] py-4 sm:border-b-0 sm:border-r sm:pr-5">
                <dt className="text-xs font-bold uppercase text-[var(--ui-text-muted)]">
                  Runtime coverage
                </dt>
                <dd className="mt-2 text-sm">
                  South America and North/Central America
                </dd>
              </div>
              <div className="border-b border-[var(--ui-border)] py-4 sm:border-b-0 sm:border-r sm:px-5">
                <dt className="text-xs font-bold uppercase text-[var(--ui-text-muted)]">
                  Preview
                </dt>
                <dd className="mt-2 text-sm">SVG at a 2400 x 3600 canvas</dd>
              </div>
              <div className="py-4 sm:pl-5">
                <dt className="text-xs font-bold uppercase text-[var(--ui-text-muted)]">
                  Export
                </dt>
                <dd className="mt-2 text-sm">SVG, PNG, and PDF presets</dd>
              </div>
            </dl>
          </section>

          <section
            id="architecture"
            className="scroll-mt-24 border-t border-[var(--ui-border)] py-16"
          >
            <SectionHeading
              eyebrow="Architecture"
              title="One geometry path, one composition model."
              description="Preview and export use the same request model and SVG renderer. Export adds a conversion step and an audit manifest after the composition has been generated."
            />
            <ol className="mt-10 grid gap-7 md:grid-cols-2 xl:grid-cols-5 xl:gap-0">
              {PIPELINE.map(([number, title, description]) => (
                <li
                  key={number}
                  className="border-t border-[var(--ui-border-strong)] pt-4 xl:px-4 xl:first:pl-0 xl:last:pr-0"
                >
                  <p className="font-mono text-xs text-[var(--ui-action)]">
                    {number}
                  </p>
                  <h3 className="mt-5 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ui-text-muted)]">
                    {description}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section
            id="quick-start"
            className="scroll-mt-24 border-t border-[var(--ui-border)] py-16"
          >
            <SectionHeading
              eyebrow="Quick start"
              title="Resolve IDs before rendering."
              description="Geography and preset IDs are data-driven. Read the registries first rather than hard-coding a display name."
            />
            <div className="mt-9 space-y-6">
              <div>
                <h3 className="mb-3 font-semibold">1. Set the API origin</h3>
                <CodeBlock>{`export API_BASE="${API_BASE}"`}</CodeBlock>
              </div>
              <div>
                <h3 className="mb-3 font-semibold">
                  2. Read geographies and presets
                </h3>
                <CodeBlock>{`curl "$API_BASE/geographies"\ncurl "$API_BASE/presets"`}</CodeBlock>
              </div>
              <div>
                <h3 className="mb-3 font-semibold">3. Request a preview</h3>
                <CodeBlock>{PREVIEW_REQUEST}</CodeBlock>
              </div>
            </div>
          </section>

          <section
            id="render"
            className="scroll-mt-24 border-t border-[var(--ui-border)] py-16"
          >
            <SectionHeading
              eyebrow="Render request"
              title="POST /preview"
              description="Returns the composed poster as image/svg+xml. Use it for review and interactive layout work before requesting the final export."
            />
            <div className="mt-9 grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="font-semibold">Core fields</h3>
                <dl className="mt-4 divide-y divide-[var(--ui-border)] border-y border-[var(--ui-border)] text-sm">
                  {[
                    ["geography_id", "Required registered boundary ID."],
                    ["density_preset", "Network density and classification rules."],
                    ["style", "Versioned standard or flag-derived palette selection."],
                    ["typography", "Registered typography preset ID."],
                    ["metadata_options", "Granular poster-element visibility."],
                    ["layout_overrides", "Optional element x, y, and scale overrides."],
                  ].map(([term, definition]) => (
                    <div key={term} className="py-3">
                      <dt className="font-mono text-xs font-semibold">{term}</dt>
                      <dd className="mt-1 text-[var(--ui-text-muted)]">
                        {definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <h3 className="font-semibold">Response contract</h3>
                <dl className="mt-4 divide-y divide-[var(--ui-border)] border-y border-[var(--ui-border)] text-sm">
                  {[
                    ["Content-Type", "image/svg+xml"],
                    ["X-River-Count", "Number of retained river features."],
                    ["X-Geography-Name", "Resolved display name."],
                    ["X-Feature-Summary", "Feature counts by display class."],
                  ].map(([term, definition]) => (
                    <div key={term} className="py-3">
                      <dt className="font-mono text-xs font-semibold">{term}</dt>
                      <dd className="mt-1 text-[var(--ui-text-muted)]">
                        {definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>

          <section
            id="export"
            className="scroll-mt-24 border-t border-[var(--ui-border)] py-16"
          >
            <SectionHeading
              eyebrow="Export request"
              title="POST /export"
              description="Uses the render fields plus format and size settings. The response body is the file itself; filename and manifest data are returned in headers."
            />
            <div className="mt-9">
              <CodeBlock>{EXPORT_REQUEST}</CodeBlock>
            </div>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="font-semibold">Export sizes</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--ui-text-muted)]">
                  digital_poster, high_res_poster, instagram_portrait,
                  print_18x24, square_design_asset, or custom.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Response headers</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--ui-text-muted)]">
                  Content-Disposition provides the filename. X-Export-Manifest
                  records the resolved inputs, sources, canvas, rule versions,
                  feature summary, and output hash.
                </p>
              </div>
            </div>
          </section>

          <section
            id="presets"
            className="scroll-mt-24 border-t border-[var(--ui-border)] py-16"
          >
            <SectionHeading
              eyebrow="Preset registry"
              title="GET /presets"
              description="Returns the currently available density, palette, typography, and flag-derived style definitions. Treat these IDs as the source of truth for request construction."
            />
            <div className="mt-9 grid gap-6 sm:grid-cols-3">
              {[
                [
                  "Density",
                  "Filtering thresholds and stream-order-to-display-class mapping.",
                ],
                [
                  "Palette",
                  "Background, feature hierarchy, and text color tokens.",
                ],
                [
                  "Typography",
                  "Registered title and subtitle font, weight, and tracking values.",
                ],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="border-t border-[var(--ui-border-strong)] pt-4"
                >
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ui-text-muted)]">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section
            id="errors"
            className="scroll-mt-24 border-t border-[var(--ui-border)] py-16"
          >
            <SectionHeading
              eyebrow="Errors and limits"
              title="Validate the combination, not only each field."
            />
            <div className="mt-9 grid gap-10 md:grid-cols-2">
              <div>
                <h3 className="font-semibold">Common responses</h3>
                <dl className="mt-4 divide-y divide-[var(--ui-border)] border-y border-[var(--ui-border)] text-sm">
                  {[
                    ["404", "Unknown geography or density preset."],
                    ["422", "Invalid request, style, export size, or format combination."],
                    ["503", "Database unavailable or not ready."],
                    ["500", "Unexpected processing or conversion failure."],
                  ].map(([code, description]) => (
                    <div key={code} className="flex gap-5 py-3">
                      <dt className="w-10 shrink-0 font-mono font-semibold">
                        {code}
                      </dt>
                      <dd className="text-[var(--ui-text-muted)]">
                        {description}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <h3 className="font-semibold">Current limits</h3>
                <ul className="mt-4 divide-y divide-[var(--ui-border)] border-y border-[var(--ui-border)] text-sm">
                  <li className="py-3">
                    Custom output: shortest side at least 1000 px; longest side
                    at most 9000 px.
                  </li>
                  <li className="py-3">
                    Transparent design assets support PNG and SVG, not PDF.
                  </li>
                  <li className="py-3">
                    Runtime data is regional; global HydroRIVERS is not queried.
                  </li>
                  <li className="py-3">
                    Source line geometries are repaired at rest where available;
                    the fallback clipping path applies ST_MakeValid.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section
            id="glossary"
            className="scroll-mt-24 border-t border-[var(--ui-border)] py-16"
          >
            <SectionHeading eyebrow="Glossary" title="Terms used by the API." />
            <dl className="mt-9 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {[
                [
                  "Display class",
                  "Cartographic rank assigned to a river line, such as major, primary, secondary, minor, or headwater.",
                ],
                [
                  "Stream order",
                  "HydroRIVERS hierarchy value used by density presets to retain and classify network features.",
                ],
                [
                  "Style selection",
                  "Versioned palette choice containing mode, preset ID, optional variant, and token overrides.",
                ],
                [
                  "Design asset mode",
                  "Transparent output mode that removes poster text and cartographic annotation.",
                ],
                [
                  "Layout override",
                  "Optional x, y, and scale adjustment for a supported poster element.",
                ],
                [
                  "Export manifest",
                  "JSON response header describing resolved inputs, rules, sources, output dimensions, and SHA-256 hash.",
                ],
              ].map(([term, definition]) => (
                <div
                  key={term}
                  className="border-t border-[var(--ui-border)] pt-4"
                >
                  <dt className="font-semibold">{term}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-[var(--ui-text-muted)]">
                    {definition}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section
            id="schema"
            className="scroll-mt-24 border-t border-[var(--ui-border)] pt-16"
          >
            <SectionHeading
              eyebrow="Reference"
              title="Interactive API schema"
              description="The backend-hosted Swagger UI reflects the complete FastAPI application, including the poster and Drone modules currently hosted by the shared backend."
            />
            <div className="mt-9 overflow-hidden rounded-lg border border-[var(--ui-border)] bg-white">
              <iframe
                src={`${API_BASE}/docs`}
                title="Interactive API schema"
                className="h-[75vh] min-h-[44rem] w-full"
              />
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
