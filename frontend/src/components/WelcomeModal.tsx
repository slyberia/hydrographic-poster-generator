"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "hydro-welcome-dismissed";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STEPS: Step[] = [
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

export default function WelcomeModal() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // Show the modal if user hasn't dismissed it before.
    try {
      if (!localStorage.getItem(DISMISSED_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (SSR, privacy mode) — show anyway.
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      try {
        localStorage.setItem(DISMISSED_KEY, "1");
      } catch {
        // Ignore.
      }
    }, 300);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: "rgba(2, 2, 3, 0.75)", backdropFilter: "blur(8px)" }}
    >
      <div
        className={`relative w-full max-w-md transform transition-all duration-300 ${
          closing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        style={{
          background: "rgba(10, 10, 14, 0.92)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          boxShadow: "0 24px 80px -12px rgba(0, 0, 0, 0.6), 0 0 60px -20px rgba(94, 106, 210, 0.12)",
        }}
      >
        {/* ── Header ── */}
        <div className="px-7 pt-7 pb-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)] mb-2">
            Welcome
          </p>
          <h2
            className="text-[22px] font-bold leading-tight tracking-tight text-white"
            style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif" }}
          >
            Hydrographic Poster Generator
          </h2>
          <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--foreground-muted)]">
            Create stunning, high-resolution river network poster maps from
            HydroRIVERS data. Select a geography, customize your style, and
            export print-ready posters or transparent design assets.
          </p>
        </div>

        {/* ── Divider ── */}
        <div className="mx-7 my-4 h-px bg-white/[0.06]" />

        {/* ── Steps ── */}
        <div className="px-7">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)] mb-3">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            How It Works
          </p>

          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div key={i} className="flex gap-3.5 group">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200"
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    color: "var(--foreground-muted)",
                  }}
                >
                  {step.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white leading-snug">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--foreground-muted)]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tip ── */}
        <div className="mx-7 mt-5 mb-6">
          <div
            className="flex items-start gap-2.5 rounded-xl px-4 py-3"
            style={{
              background: "rgba(94, 106, 210, 0.06)",
              border: "1px solid rgba(94, 106, 210, 0.12)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <p className="text-[12px] leading-relaxed text-[var(--foreground-muted)]">
              <span className="font-medium text-[var(--accent)]">Tip: </span>
              Toggle &ldquo;Design asset mode&rdquo; to export transparent
              river-network layers — perfect for DTG printing, screenprinting,
              or design overlays.
            </p>
          </div>
        </div>

        {/* ── Action ── */}
        <div className="px-7 pb-7">
          <button
            type="button"
            onClick={dismiss}
            className="btn-primary text-sm"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
