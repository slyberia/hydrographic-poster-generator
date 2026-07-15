"use client";
import React, { useEffect, useRef, useState } from "react";

import { ElementOffset, LayoutOverrides } from "@/lib/types";

export interface InteractiveCanvasProps {
  svg: string;
  transforms: LayoutOverrides;
  onTransformsChange: (transforms: LayoutOverrides) => void;
  onReset: () => void;
}

const DRAGGABLE_GROUPS = [
  "title_block",
  "metadata",
  "legend",
  "north_arrow"
];

const DRAG_THRESHOLD = 3;

export default function InteractiveCanvas({ svg, transforms, onTransformsChange, onReset }: InteractiveCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeElement, setActiveElement] = useState<string | null>(null);
  const transformsRef = useRef(transforms);
  const onTransformsChangeRef = useRef(onTransformsChange);

  useEffect(() => {
    transformsRef.current = transforms;
  }, [transforms]);

  useEffect(() => {
    onTransformsChangeRef.current = onTransformsChange;
  }, [onTransformsChange]);

  useEffect(() => {
    if (!containerRef.current || !svg) return;

    const container = containerRef.current;
    const svgEl = container.querySelector("svg");
    if (!svgEl) return;

    const KEY_INCREMENT = 10;
    const KEY_INCREMENT_SHIFT = 50;

    const handleElementKeyDown = (e: KeyboardEvent) => {
      const target = e.currentTarget as Element;
      if (!target.id || !DRAGGABLE_GROUPS.includes(target.id)) return;
      
      let dx = 0;
      let dy = 0;
      const step = e.shiftKey ? KEY_INCREMENT_SHIFT : KEY_INCREMENT;

      if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;
      
      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        const key = target.id as keyof LayoutOverrides;
        const currentT = transformsRef.current[key] || { x: 0, y: 0 };
        let newX = currentT.x + dx;
        let newY = currentT.y + dy;
        newX = Math.max(-3600, Math.min(3600, newX));
        newY = Math.max(-5400, Math.min(5400, newY));

        onTransformsChangeRef.current({
          ...transformsRef.current,
          [target.id]: { ...currentT, x: newX, y: newY }
        });
      }
    };

    // Apply cursor styles and touch-action to draggable groups
    DRAGGABLE_GROUPS.forEach(id => {
      const el = svgEl.querySelector(`#${id}`);
      if (el instanceof SVGElement) {
        el.style.cursor = "grab";
        el.style.touchAction = "none";
        el.setAttribute("tabindex", "0");
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", `Move ${id.replace("_", " ")}`);
        el.addEventListener("keydown", handleElementKeyDown as EventListener);
      }
    });

    let draggingId: string | null = null;
    let dragStartEvent: PointerEvent | null = null;
    let initialTransformAttr = "";
    let startTx = 0;
    let startTy = 0;
    let isDragging = false;

    const getSVGScaler = () => {
      const ctm = svgEl.getScreenCTM();
      return ctm ? 1 / ctm.a : 1; 
    };

    const handlePointerDown = (e: PointerEvent) => {
      let target = e.target as Element | null;
      let matchedId: string | null = null;

      while (target && target !== svgEl) {
        if (target.id && DRAGGABLE_GROUPS.includes(target.id)) {
          matchedId = target.id;
          break;
        }
        target = target.parentElement;
      }

      if (matchedId) {
        // e.preventDefault() is discouraged on pointerdown for touch, but we use touch-action: none.
        draggingId = matchedId;
        dragStartEvent = e;
        isDragging = false;
        
        const key = matchedId as keyof LayoutOverrides;
        const currentT = transformsRef.current[key] || { x: 0, y: 0 };
        startTx = currentT.x;
        startTy = currentT.y;
        
        const el = svgEl.querySelector(`#${matchedId}`);
        if (el instanceof SVGElement) {
          initialTransformAttr = el.getAttribute("transform") || "";
          el.setPointerCapture(e.pointerId);
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!draggingId || !dragStartEvent) return;

      const scaler = getSVGScaler();
      const dx = (e.clientX - dragStartEvent.clientX) * scaler;
      const dy = (e.clientY - dragStartEvent.clientY) * scaler;

      // Threshold check
      if (!isDragging) {
        if (Math.abs(e.clientX - dragStartEvent.clientX) > DRAG_THRESHOLD || 
            Math.abs(e.clientY - dragStartEvent.clientY) > DRAG_THRESHOLD) {
          isDragging = true;
          setActiveElement(draggingId);
          document.body.style.userSelect = "none"; // Prevent text selection
          
          const el = svgEl.querySelector(`#${draggingId}`);
          if (el instanceof SVGElement) {
            el.style.cursor = "grabbing";
          }
        }
      }

      if (isDragging) {
        // Optimistic DOM manipulation
        const el = svgEl.querySelector(`#${draggingId}`);
        if (el instanceof SVGElement) {
          // Calculate new raw coordinates
          let newX = startTx + dx;
          let newY = startTy + dy;
          
          // Clamp optimistic bounds
          newX = Math.max(-3600, Math.min(3600, newX));
          newY = Math.max(-5400, Math.min(5400, newY));

          // Append an unscaled translation to the existing matrix
          el.setAttribute("transform", `${initialTransformAttr} translate(${newX - startTx}, ${newY - startTy})`);
        }
      }
    };

    const commitDrag = (e: PointerEvent) => {
      if (!draggingId || !dragStartEvent) return;

      const el = svgEl.querySelector(`#${draggingId}`);
      if (el instanceof SVGElement) {
        el.releasePointerCapture(e.pointerId);
        el.style.cursor = "grab";
      }

      document.body.style.userSelect = "";

      if (isDragging) {
        const scaler = getSVGScaler();
        const dx = (e.clientX - dragStartEvent.clientX) * scaler;
        const dy = (e.clientY - dragStartEvent.clientY) * scaler;

        let newX = startTx + dx;
        let newY = startTy + dy;
        newX = Math.max(-3600, Math.min(3600, newX));
        newY = Math.max(-5400, Math.min(5400, newY));

        const key = draggingId as keyof LayoutOverrides;
        const currentT = transformsRef.current[key] || { x: 0, y: 0 };
        
        onTransformsChangeRef.current({
          ...transformsRef.current,
          [draggingId]: {
            ...currentT,
            x: newX,
            y: newY,
          }
        });
      }

      draggingId = null;
      dragStartEvent = null;
      isDragging = false;
      setActiveElement(null);
    };

    const handlePointerUp = (e: PointerEvent) => {
      commitDrag(e);
    };

    const handlePointerCancel = (e: PointerEvent) => {
      // Revert optimistic DOM on cancel
      if (draggingId) {
        const el = svgEl.querySelector(`#${draggingId}`);
        if (el instanceof SVGElement) {
          el.setAttribute("transform", initialTransformAttr);
          el.releasePointerCapture(e.pointerId);
          el.style.cursor = "grab";
        }
      }
      document.body.style.userSelect = "";
      draggingId = null;
      dragStartEvent = null;
      isDragging = false;
      setActiveElement(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && draggingId) {
        // Mock a cancel event
        const el = svgEl.querySelector(`#${draggingId}`);
        if (el instanceof SVGElement) {
          el.setAttribute("transform", initialTransformAttr);
          el.style.cursor = "grab";
        }
        document.body.style.userSelect = "";
        draggingId = null;
        dragStartEvent = null;
        isDragging = false;
        setActiveElement(null);
      }
    };

    svgEl.addEventListener("pointerdown", handlePointerDown as EventListener);
    svgEl.addEventListener("pointermove", handlePointerMove as EventListener);
    svgEl.addEventListener("pointerup", handlePointerUp as EventListener);
    svgEl.addEventListener("pointercancel", handlePointerCancel as EventListener);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      svgEl.removeEventListener("pointerdown", handlePointerDown as EventListener);
      svgEl.removeEventListener("pointermove", handlePointerMove as EventListener);
      svgEl.removeEventListener("pointerup", handlePointerUp as EventListener);
      svgEl.removeEventListener("pointercancel", handlePointerCancel as EventListener);
      window.removeEventListener("keydown", handleKeyDown);
      DRAGGABLE_GROUPS.forEach(id => {
        const el = svgEl.querySelector(`#${id}`);
        if (el instanceof SVGElement) {
          el.removeEventListener("keydown", handleElementKeyDown as EventListener);
        }
      });
    };
  }, [svg]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Active Element Indicator / Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel z-10 opacity-0 hover:opacity-100 transition-opacity" style={{ opacity: activeElement || Object.keys(transforms).length > 0 ? 1 : 0 }}>
        <span className="text-[11px] font-medium text-[var(--foreground)] uppercase tracking-wider">
          {activeElement ? `Moving ${activeElement.replace("_", " ")}` : "Layout Editor"}
        </span>
        
        {Object.keys(transforms).length > 0 && (
          <>
            <div className="w-px h-3 bg-[var(--foreground)]/20 mx-1" />
            <button 
              onClick={onReset}
              className="text-[11px] text-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
            >
              Reset
            </button>
          </>
        )}
      </div>

      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center interactive-svg-container"
        dangerouslySetInnerHTML={{ __html: svg }} 
      />
    </div>
  );
}
