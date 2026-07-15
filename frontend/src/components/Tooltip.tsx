"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { FEATURE_FLAGS } from "@/lib/features";

interface TooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  id?: string;
}

export function Tooltip({ children, content, id }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipId = id || (typeof content === "string" ? content.replace(/\s+/g, '-').toLowerCase() : "tooltip");

  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        hide();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isVisible, hide]);

  if (!FEATURE_FLAGS.new_tooltip_system) {
    // If feature flag is off, just render the child natively (could use native title as fallback)
    return React.cloneElement(children, {
      title: typeof content === "string" ? content : undefined,
    });
  }

  // Intercept focus and blur for keyboard accessibility on the trigger element
  const childWithEvents = React.cloneElement(children, {
    onFocus: (e: React.FocusEvent) => {
      show();
      children.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hide();
      children.props.onBlur?.(e);
    },
    onMouseEnter: (e: React.MouseEvent) => {
      show();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide();
      children.props.onMouseLeave?.(e);
    },
    "aria-describedby": isVisible ? tooltipId : undefined,
  });

  return (
    <div ref={containerRef} className="relative inline-flex items-center justify-center">
      {childWithEvents}
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full mb-2 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none transform transition-opacity duration-200"
        >
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}
