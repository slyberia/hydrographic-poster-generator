"use client";

/** components/drone/InfoTip.tsx — small accessible ⓘ popover for inline help.
 * Opens on hover and on focus/click (keyboard + touch). Popover text is
 * plain string copy from droneInfo.ts. */

import { useId, useState } from "react";

export default function InfoTip(props: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="infotip" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="infotip-btn"
        aria-label={props.label ?? "More information"}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ⓘ
      </button>
      {open && (
        <span role="tooltip" id={id} className="infotip-pop">
          {props.text}
        </span>
      )}
    </span>
  );
}
