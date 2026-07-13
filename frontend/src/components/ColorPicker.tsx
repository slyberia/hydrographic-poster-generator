"use client";
import React from "react";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center justify-between py-1.5 group">
      <span className="text-[12px] text-[var(--foreground-muted)] group-hover:text-[var(--foreground)] transition-colors">
        {label}
      </span>
      <div className="relative h-6 w-6 rounded-full border border-white/10 shadow-inner overflow-hidden ring-1 ring-white/5 cursor-pointer group-hover:ring-white/20 transition-all">
        <div 
          className="absolute inset-0"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
          title={`Change ${label} color`}
        />
      </div>
    </div>
  );
}
