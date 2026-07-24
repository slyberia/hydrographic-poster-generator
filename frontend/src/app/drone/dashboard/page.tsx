"use client";

/** app/drone/dashboard/page.tsx — internal reporting surface (UX-9).
 *
 * Viewer-authorized. Renders bounded aggregates from GET /dashboard: published
 * zone distribution, run/publish recency, least-stable factors, recent-run
 * classification history, model version, and data freshness. It never fetches
 * cell geometry — the map editor is the console; this is the reporting view. */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { droneApi as api, DashboardData, DashZone, Zone } from "@/lib/droneApi";
import { createClient, isSupabaseConfigured } from "@/utils/supabase/client";
import { ZONE_CSS, ZONE_LABELS } from "@/lib/zoneTheme";

const DASH_ROLES = new Set(["viewer", "analyst", "admin"]);
const ZONE_ORDER: Zone[] = ["PROHIBITED", "RESTRICTED", "CONDITIONAL", "SUITABLE"];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export default function Page() {
  const router = useRouter();
  const localAuthBypass = !isSupabaseConfigured && process.env.NODE_ENV !== "production";
  const [authorized, setAuthorized] = useState(localAuthBypass);

  useEffect(() => {
    if (localAuthBypass) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        router.replace("/login?next=/drone/dashboard");
        return;
      }
      if (!DASH_ROLES.has(data.user.app_metadata.app_role)) {
        router.replace("/login?error=role");
        return;
      }
      setAuthorized(true);
    });
  }, [localAuthBypass, router]);

  if (!authorized) {
    return (
      <div className="drone-console">
        <main className="dash dash--center" role="status">
          Checking access…
        </main>
      </div>
    );
  }

  const signOut = isSupabaseConfigured
    ? async () => {
        await createClient().auth.signOut();
        router.replace("/login");
      }
    : undefined;

  return <Dashboard onSignOut={signOut} />;
}

function ZoneBar({ zones }: { zones: DashZone[] }) {
  const byZone = new Map(zones.map((z) => [z.zone, z]));
  return (
    <div
      className="zonestrip-bar"
      role="img"
      aria-label={zones.map((z) => `${z.zone} ${z.pct}%`).join(", ")}
    >
      {ZONE_ORDER.map((zone) => {
        const z = byZone.get(zone);
        if (!z || z.pct === 0) return null;
        return (
          <div
            key={zone}
            className="zonestrip-seg"
            style={{ flex: `${z.pct} 0 0`, background: ZONE_CSS[zone] }}
          />
        );
      })}
    </div>
  );
}

function Dashboard({ onSignOut }: { onSignOut?: () => Promise<void> }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      setData(await api.getDashboard());
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  return (
    <div className="drone-console">
      <div className="dash">
        <header className="dash-header">
          <div>
            <h1 className="brand">
              Zoning Dashboard
              <small>{data?.study_area?.display_name ?? "Region 4 · decision-support prototype"}</small>
            </h1>
            <nav className="rail-nav" aria-label="Drone sections">
              <Link href="/drone/console">Console</Link>
              <Link href="/drone/methodology">Methodology</Link>
            </nav>
          </div>
          {onSignOut && (
            <button type="button" className="helpbtn" onClick={() => void onSignOut()}>
              Sign out
            </button>
          )}
        </header>

        {phase === "loading" && (
          <p className="statusline" role="status">Loading dashboard…</p>
        )}

        {phase === "error" && (
          <div className="dash-card" role="alert">
            <strong>Couldn’t load the dashboard</strong>
            <p className="statusline error">{error}</p>
            <button type="button" className="btn" onClick={() => void load()}>Try again</button>
          </div>
        )}

        {phase === "ready" && data && <DashboardBody data={data} />}
      </div>
    </div>
  );
}

function DashboardBody({ data }: { data: DashboardData }) {
  if (!data.study_area) {
    return (
      <div className="dash-card" role="status">
        <strong>No study area configured</strong>
        <p className="statusline">Configure a study area to see dashboard metrics.</p>
      </div>
    );
  }

  const { published, latest_run, run_history, sensitivity, freshness } = data;

  return (
    <>
      {freshness.is_stale && (
        <p className="dash-banner dash-banner--warn" role="status">
          <strong>Published data is {freshness.days_since_published} days old</strong> —
          older than the {freshness.stale_threshold_days}-day review threshold. Consider
          re-running and publishing an updated model.
        </p>
      )}

      <div className="dash-grid">
        <section className="dash-card" aria-labelledby="dash-published">
          <p className="sectionlabel" id="dash-published">Published run</p>
          {published ? (
            <dl className="dash-dl">
              <dt>Label</dt><dd>{published.label ?? "unlabelled"}</dd>
              <dt>Published</dt><dd>{fmtDate(published.published_at)}</dd>
              <dt>Published by</dt><dd>{published.published_by ?? "—"}</dd>
              <dt>Model version</dt><dd>{data.study_area.methodology_version}</dd>
              <dt>Run</dt><dd title={published.run_id} style={{ fontVariantNumeric: "tabular-nums" }}>{shortId(published.run_id)}</dd>
            </dl>
          ) : (
            <p className="statusline">No run is published yet.</p>
          )}
        </section>

        <section className="dash-card" aria-labelledby="dash-dist">
          <p className="sectionlabel" id="dash-dist">Published zone distribution</p>
          {published ? (
            <>
              <ZoneBar zones={published.zone_distribution} />
              <table className="dash-table">
                <thead>
                  <tr>
                    <th scope="col">Zone</th>
                    <th scope="col">Share</th>
                    <th scope="col">Cells</th>
                    <th scope="col">Area</th>
                  </tr>
                </thead>
                <tbody>
                  {published.zone_distribution.map((z) => (
                    <tr key={z.zone}>
                      <td>
                        <span className="swatch" style={{ background: ZONE_CSS[z.zone] }} />{" "}
                        {ZONE_LABELS[z.zone]}
                      </td>
                      <td>{z.pct}%</td>
                      <td>{z.cells.toLocaleString()}</td>
                      <td>{z.area_km2 != null ? `${z.area_km2.toLocaleString()} km²` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="statusline">Publish a run to see its zone distribution.</p>
          )}
        </section>

        <section className="dash-card" aria-labelledby="dash-coverage">
          <p className="sectionlabel" id="dash-coverage">Coverage &amp; recency</p>
          <dl className="dash-dl">
            <dt>Analyzed area</dt>
            <dd>{published ? `${published.analyzed_area_km2.toLocaleString()} km²` : "—"}</dd>
            <dt>Analyzed cells</dt>
            <dd>{published ? published.total_cells.toLocaleString() : "—"}</dd>
            <dt>Last run</dt>
            <dd>{latest_run ? fmtDate(latest_run.completed_at ?? latest_run.created_at) : "—"}</dd>
            <dt>Last published</dt>
            <dd>{fmtDate(freshness.published_at)}</dd>
          </dl>
        </section>

        <section className="dash-card" aria-labelledby="dash-sens">
          <p className="sectionlabel" id="dash-sens">Least stable factors</p>
          {sensitivity ? (
            <>
              <p className="statusline">
                {sensitivity.pct_cells_flipped}% of cells flipped zone · avg σ{" "}
                {sensitivity.avg_stddev.toFixed(3)} · from run{" "}
                {sensitivity.base_label ?? shortId(sensitivity.base_run_id)}
              </p>
              <table className="ranktable">
                <thead>
                  <tr>
                    <th scope="col">Factor</th>
                    <th scope="col">Δ</th>
                    <th scope="col">Flips</th>
                    <th scope="col">MAD</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivity.factor_rankings.slice(0, 6).map((r) => (
                    <tr key={`${r.factor_key}-${r.direction}`}>
                      <td>{r.factor_key}</td>
                      <td>{r.direction === "up" ? "+" : "−"}</td>
                      <td>{r.zone_flips}</td>
                      <td>{r.mean_absolute_deviation.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="statusline">No sensitivity analysis recorded yet.</p>
          )}
        </section>
      </div>

      <section className="dash-card" aria-labelledby="dash-history">
        <p className="sectionlabel" id="dash-history">Recent runs — classification change</p>
        {run_history.length === 0 ? (
          <p className="statusline">No completed runs yet.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th scope="col">Run</th>
                <th scope="col">Created</th>
                <th scope="col">State</th>
                <th scope="col">Cells</th>
                <th scope="col">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {run_history.map((r) => (
                <tr key={r.run_id}>
                  <td>{r.label ?? "unlabelled"}</td>
                  <td>{fmtDate(r.created_at)}</td>
                  <td>{r.lifecycle_state}</td>
                  <td>{r.total_cells.toLocaleString()}</td>
                  <td className="dash-histbar">
                    {r.zone_distribution.length > 0 ? (
                      <ZoneBar zones={r.zone_distribution} />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
