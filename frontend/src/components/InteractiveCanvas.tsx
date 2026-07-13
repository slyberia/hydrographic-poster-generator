"use client";
import React, { useEffect, useRef, useState } from "react";

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface InteractiveCanvasProps {
  svg: string;
  transforms: Record<string, Transform>;
  onTransformsChange: (transforms: Record<string, Transform>) => void;
  onReset: () => void;
}

export default function InteractiveCanvas({ svg, transforms, onTransformsChange, onReset }: InteractiveCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeElement, setActiveElement] = useState<string | null>(null);
  const transformsRef = useRef(transforms);
  const onTransformsChangeRef = useRef(onTransformsChange);

  // Sync refs so event listeners use latest state without re-binding on every render
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

    // Apply current transforms immediately to DOM elements
    const applyTransformToDOM = (id: string, isClass = false) => {
      const el = isClass ? svgEl.querySelector(`.${id}`) : svgEl.querySelector(`#${id}`);
      if (el) {
        const t = transformsRef.current[id] || { x: 0, y: 0, scale: 1 };
        el.setAttribute("transform", `translate(${t.x},${t.y}) scale(${t.scale})`);
        
        // Make draggable
        (el as HTMLElement).style.cursor = "grab";
      }
    };

    const elementsToTrack = [
      { id: "rivers", isClass: false },
      { id: "north-arrow", isClass: false },
      { id: "legend", isClass: false },
      { id: "scale-bar", isClass: false },
      { id: "metadata", isClass: false },
      { id: "title", isClass: true },
      { id: "subtitle", isClass: true },
    ];

    elementsToTrack.forEach(item => applyTransformToDOM(item.id, item.isClass));

    let draggingId: string | null = null;
    let startX = 0;
    let startY = 0;
    let startTx = 0;
    let startTy = 0;

    // We need to convert screen pixels to SVG user space pixels.
    // Assuming viewBox is 0 0 width height
    const getSVGScaler = () => {
      const ctm = svgEl.getScreenCTM();
      return ctm ? 1 / ctm.a : 1; // Assuming uniform scaling
    };

    const handleMouseDown = (e: MouseEvent) => {
      let target = e.target as Element | null;
      let matchedId: string | null = null;

      // Walk up to find if we clicked a tracked group
      while (target && target !== svgEl) {
        if (target.id && elementsToTrack.find(item => !item.isClass && item.id === target?.id)) {
          matchedId = target.id;
          break;
        }
        if (target.classList && target.classList.contains("title")) { matchedId = "title"; break; }
        if (target.classList && target.classList.contains("subtitle")) { matchedId = "subtitle"; break; }
        target = target.parentElement;
      }

      if (matchedId) {
        e.preventDefault();
        draggingId = matchedId;
        setActiveElement(matchedId);
        startX = e.clientX;
        startY = e.clientY;
        const currentT = transformsRef.current[matchedId] || { x: 0, y: 0, scale: 1 };
        startTx = currentT.x;
        startTy = currentT.y;
        
        if (target instanceof HTMLElement || target instanceof SVGElement) {
          target.style.cursor = "grabbing";
        }
      } else {
        setActiveElement(null);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingId) return;
      e.preventDefault();

      const scaler = getSVGScaler();
      const dx = (e.clientX - startX) * scaler;
      const dy = (e.clientY - startY) * scaler;

      const currentT = transformsRef.current[draggingId] || { x: 0, y: 0, scale: 1 };
      
      const newTransforms = {
        ...transformsRef.current,
        [draggingId]: {
          ...currentT,
          x: startTx + dx,
          y: startTy + dy,
        }
      };

      onTransformsChangeRef.current(newTransforms);
    };

    const handleMouseUp = () => {
      if (draggingId) {
        const el = elementsToTrack.find(i => i.id === draggingId);
        if (el) {
          const domEl = el.isClass ? svgEl.querySelector(`.${el.id}`) : svgEl.querySelector(`#${el.id}`);
          if (domEl instanceof HTMLElement || domEl instanceof SVGElement) {
            domEl.style.cursor = "grab";
          }
        }
      }
      draggingId = null;
    };

    const handleWheel = (e: WheelEvent) => {
      // Only zoom rivers if mouse is over rivers
      let target = e.target as Element | null;
      let isRivers = false;
      while (target && target !== svgEl) {
        if (target.id === "rivers") {
          isRivers = true;
          break;
        }
        target = target.parentElement;
      }

      if (isRivers) {
        e.preventDefault();
        const currentT = transformsRef.current["rivers"] || { x: 0, y: 0, scale: 1 };
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        
        // Clamp scale between 0.2 and 4.0
        let newScale = currentT.scale * zoomDelta;
        newScale = Math.max(0.2, Math.min(newScale, 4.0));

        // Note: this scales from the origin (0,0) of the SVG group, not cursor position.
        // For MVP, this is sufficient.
        
        const newTransforms = {
          ...transformsRef.current,
          ["rivers"]: {
            ...currentT,
            scale: newScale,
          }
        };

        onTransformsChangeRef.current(newTransforms);
        setActiveElement("rivers");
      }
    };

    svgEl.addEventListener("mousedown", handleMouseDown as EventListener);
    window.addEventListener("mousemove", handleMouseMove as EventListener);
    window.addEventListener("mouseup", handleMouseUp as EventListener);
    svgEl.addEventListener("wheel", handleWheel as EventListener, { passive: false });

    return () => {
      svgEl.removeEventListener("mousedown", handleMouseDown as EventListener);
      window.removeEventListener("mousemove", handleMouseMove as EventListener);
      window.removeEventListener("mouseup", handleMouseUp as EventListener);
      svgEl.removeEventListener("wheel", handleWheel as EventListener);
    };
  }, [svg]); // Re-bind when SVG changes (since DOM is destroyed and recreated)

  // A second effect just to update the DOM elements when transforms state changes
  // so we don't need a full re-render of the SVG string.
  useEffect(() => {
    if (!containerRef.current) return;
    const svgEl = containerRef.current.querySelector("svg");
    if (!svgEl) return;

    const applyTransformToDOM = (id: string, isClass = false) => {
      const el = isClass ? svgEl.querySelector(`.${id}`) : svgEl.querySelector(`#${id}`);
      if (el) {
        const t = transforms[id] || { x: 0, y: 0, scale: 1 };
        el.setAttribute("transform", `translate(${t.x},${t.y}) scale(${t.scale})`);
      }
    };

    const elementsToTrack = [
      { id: "rivers", isClass: false },
      { id: "north-arrow", isClass: false },
      { id: "legend", isClass: false },
      { id: "scale-bar", isClass: false },
      { id: "metadata", isClass: false },
      { id: "title", isClass: true },
      { id: "subtitle", isClass: true },
    ];
    elementsToTrack.forEach(item => applyTransformToDOM(item.id, item.isClass));

  }, [transforms]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Active Element Indicator / Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel z-10 opacity-0 hover:opacity-100 transition-opacity" style={{ opacity: activeElement || Object.keys(transforms).length > 0 ? 1 : 0 }}>
        <span className="text-[11px] font-medium text-[var(--foreground)] uppercase tracking-wider">
          {activeElement ? `Moving ${activeElement.replace("-", " ")}` : "Layout Editor"}
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
