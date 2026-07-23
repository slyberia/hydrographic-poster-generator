"use client";

import type { QAItem, QASeverity } from "@/lib/qa";

const SEVERITY_STYLES: Record<QASeverity, string> = {
  pass: "bg-emerald-950/60 text-emerald-300 ring-emerald-700/50",
  warning: "bg-amber-950/60 text-amber-300 ring-amber-700/50",
  block: "bg-red-950/60 text-red-300 ring-red-700/50",
};

const SEVERITY_LABELS: Record<QASeverity, string> = {
  pass: "Pass",
  warning: "Warning",
  block: "Block",
};

export default function QAChecklist({ items }: { items: QAItem[] }) {
  return (
    // role="status": QA severity changes are announced to screen readers
    // without stealing focus (polite live region).
    <ul className="space-y-1.5" role="status">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2 text-xs">
          <span
            className={`mt-px shrink-0 rounded-full px-2 py-0.5 font-medium ring-1 ${SEVERITY_STYLES[item.severity]}`}
          >
            {SEVERITY_LABELS[item.severity]}
          </span>
          <span className="min-w-0">
            <span className="font-medium text-[var(--ui-text)]">{item.label}</span>
            <span className="block text-[var(--ui-text-muted)]">{item.message}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
