import Link from "next/link";
import Image from "next/image";

const STEPS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: "Select Geography",
    description:
      "Choose a region and country from the CARICOM nations and surrounding areas. Optionally drill down to a state or province.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="2.5" />
        <path d="M17.5 10.5c1.7 0 3 1.3 3 3v1H21" />
        <circle cx="8.5" cy="6.5" r="2.5" />
        <path d="M3 14.5c0-1.7 1.3-3 3-3h5c1.7 0 3 1.3 3 3v1H3v-1z" />
        <path d="M5 20h14" />
        <path d="M8 20v-2" />
        <path d="M16 20v-2" />
      </svg>
    ),
    title: "Customize Style",
    description:
      "Pick a density preset, color palette, and typography style. These presets control how your river network is classified and rendered.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: "Add Text",
    description:
      'Enter a poster title and subtitle. These are rendered directly onto the map in the typography style you selected.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    title: "Export",
    description:
      "Choose PNG, SVG, or PDF. Select a preset size or enter custom dimensions. Review the QA checklist, then generate your export.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-[var(--background)] overflow-hidden flex flex-col items-center">
      {/* ── Header ── */}
      <header className="absolute top-0 left-0 w-full p-6 z-50 flex justify-between items-center max-w-6xl mx-auto">
        <div>
          <h1
            className="text-xl font-semibold tracking-tight text-white"
            style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif" }}
          >
            Hydro Poster
          </h1>
        </div>
        <nav className="flex gap-6">
          <Link
            href="/about"
            className="text-[13px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-200"
          >
            About
          </Link>
          <Link
            href="/docs"
            className="text-[13px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-200"
          >
            API Docs
          </Link>
        </nav>
      </header>

      {/* ── Ambient glow blobs ── */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-30 mix-blend-screen filter blur-[100px] bg-[var(--accent)] pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 mix-blend-screen filter blur-[120px] bg-[var(--foreground-muted)] pointer-events-none" aria-hidden="true" />

      {/* ── Hero Section ── */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-32 lg:pt-40 pb-16 flex flex-col items-center text-center mt-12">
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)] mb-6">
          Generative Cartography
        </p>
        <h1
          className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-white mb-6"
          style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif" }}
        >
          Hydrographic <br className="hidden lg:block" /> Poster Generator
        </h1>
        <p className="text-lg lg:text-xl text-[var(--foreground-muted)] max-w-2xl leading-relaxed mb-10">
          Create stunning, high-resolution river network poster maps from HydroRIVERS data. Select a geography, customize your style, and export print-ready posters or transparent design assets.
        </p>
        
        <Link 
          href="/studio"
          className="btn-primary text-base px-8 py-4 shadow-[0_8px_30px_rgb(94,106,210,0.3)] hover:shadow-[0_8px_30px_rgb(94,106,210,0.5)] transition-all duration-300"
        >
          Launch Generator
        </Link>
      </div>

      {/* ── How It Works ── */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24">
        <h2
          className="text-3xl font-semibold text-white mb-12 text-center"
          style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif" }}
        >
          How It Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-5 group">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors duration-200"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "var(--foreground)",
                }}
              >
                {step.icon}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-white leading-snug mb-2">
                  {step.title}
                </p>
                <p className="text-sm leading-relaxed text-[var(--foreground-muted)]">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pro Tip ── */}
      <div className="relative z-10 w-full max-w-3xl mx-auto px-6 pb-32">
        <div
          className="flex flex-col md:flex-row items-center md:items-start gap-4 rounded-2xl p-6 md:p-8 text-center md:text-left"
          style={{
            background: "rgba(94, 106, 210, 0.04)",
            border: "1px solid rgba(94, 106, 210, 0.15)",
          }}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-white mb-2">Design Asset Mode</h3>
            <p className="text-sm leading-relaxed text-[var(--foreground-muted)]">
              Toggle &ldquo;Design asset mode&rdquo; in the generator to export transparent river-network layers. This skips the poster background, text, and metadata — perfect for DTG printing, screenprinting, or layering in Adobe Illustrator.
            </p>
          </div>
        </div>
      </div>

    </main>
  );
}
