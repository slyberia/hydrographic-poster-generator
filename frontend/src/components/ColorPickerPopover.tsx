"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

interface ColorPickerPopoverProps {
  label: string;
  initialColor: string;
  activeColors: string[];
  onChange: (color: string) => void;
  onCommit: (color: string) => void;
  onClose: () => void;
  triggerRect: DOMRect | null;
}

export default function ColorPickerPopover({
  label,
  initialColor,
  activeColors,
  onChange,
  onCommit,
  onClose,
  triggerRect,
}: ColorPickerPopoverProps) {
  const [color, setColor] = useState(initialColor);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const commitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal state when initialColor changes externally
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColor(initialColor);
  }, [initialColor]);

  // Handle positioning
  useEffect(() => {
    if (triggerRect && popoverRef.current) {
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const padding = 8;
      
      let top = triggerRect.top;
      let left = triggerRect.right + padding;
      
      // Prevent going off screen
      if (left + popoverRect.width > window.innerWidth) {
        left = triggerRect.left - popoverRect.width - padding;
      }
      if (top + popoverRect.height > window.innerHeight) {
        top = window.innerHeight - popoverRect.height - padding;
      }
      
      setPosition({ top, left });
    }
  }, [triggerRect]);

  // Click outside listener
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // We clicked outside the popover. Commit and close.
        if (commitTimeoutRef.current) clearTimeout(commitTimeoutRef.current);
        onCommit(color);
        onClose();
      }
    };
    
    // Use pointerdown to catch clicks before they trigger other elements
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onClose, onCommit, color]);

  // Debounced commit logic
  const handleColorChange = useCallback((newColor: string) => {
    setColor(newColor);
    onChange(newColor);
    
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
    }
    
    commitTimeoutRef.current = setTimeout(() => {
      onCommit(newColor);
    }, 300);
  }, [onChange, onCommit]);

  const handleSwatchClick = (newColor: string) => {
    setColor(newColor);
    onChange(newColor);
    onCommit(newColor);
  };

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleColorChange(e.target.value);
  };

  if (!triggerRect) return null;

  const content = (
    <div
      ref={popoverRef}
      className="glass-panel p-4 absolute z-50 shadow-2xl flex flex-col gap-3 min-w-[200px]"
      style={{
        top: position.top,
        left: position.left,
        animation: "fadeIn 0.15s ease-out forwards",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
        <span className="text-xs font-medium capitalize text-[var(--foreground)]">{label.replace(/_/g, " ")}</span>
        <button onClick={onClose} className="text-[10px] text-[var(--foreground-muted)] hover:text-white transition-colors">
          CLOSE
        </button>
      </div>

      {/* Document Colors Row */}
      {activeColors.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-[var(--foreground-muted)]">Document Colors</span>
          <div className="flex flex-wrap gap-1.5">
            {activeColors.map((c, i) => (
              <button
                key={`${c}-${i}`}
                className="w-5 h-5 rounded-full border border-white/20 shadow-sm cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                onClick={() => handleSwatchClick(c)}
                title={c}
              />
            ))}
          </div>
        </div>
      )}

      {/* Native Color Input */}
      <div className="flex flex-col gap-1.5 mt-1">
        <span className="text-[10px] text-[var(--foreground-muted)]">Custom</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={handleNativeColorChange}
            className="w-full h-8 rounded cursor-pointer bg-transparent border-0 p-0"
            style={{ WebkitAppearance: 'none' }}
          />
          <span className="text-xs font-mono text-[var(--foreground-muted)] uppercase bg-black/20 px-2 py-1 rounded">
            {color}
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
