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
    return React.cloneElement(children as React.ReactElement<{ title?: string }>, {
      title: typeof content === "string" ? content : undefined,
    });
  }

  interface TooltipTargetProps {
    onFocus?: React.FocusEventHandler<HTMLElement>;
    onBlur?: React.FocusEventHandler<HTMLElement>;
    onMouseEnter?: React.MouseEventHandler<HTMLElement>;
    onMouseLeave?: React.MouseEventHandler<HTMLElement>;
    "aria-describedby"?: string;
  }

  const childProps = children.props as TooltipTargetProps;

  // Intercept focus and blur for keyboard accessibility on the trigger element
  const childWithEvents = React.cloneElement(children as React.ReactElement<TooltipTargetProps>, {
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      show();
      childProps.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      hide();
      childProps.onBlur?.(e);
    },
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      show();
      childProps.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      hide();
      childProps.onMouseLeave?.(e);
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
