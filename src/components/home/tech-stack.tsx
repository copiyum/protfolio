"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./tech-stack.module.css";
import { techStack, type TechItem } from "@/data/tech-stack";
import TechIcon from "../ui/tech-icon";

const TECH_STACK_CLICK_TIMEOUT = 5000; // ms — clicked badge persistence
const TECH_STACK_BOUNCE_DURATION = 300; // ms — icon bounce
const IDLE_COLOR = "#9ca3af"; // brighter neutral gray — readable on near-black (idle ~0.6 luminance)

export default function TechStack() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [clickedOrder, setClickedOrder] = useState<number[]>([]);
  // store timers per-clicked index so each clicked badge disappears 5s after its own click
  const timersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const [isHoveringTechStack, setIsHoveringTechStack] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorHaloRef = useRef<HTMLDivElement | null>(null);
  const cursorDotRef = useRef<HTMLDivElement | null>(null);
  const cursorPos = useRef({ x: 0, y: 0 });

  // Writes the latest cursor position to a node — used both by the move handler
  // and by the callback refs, so a freshly-mounted dot lands in the right spot.
  const placeCursor = (node: HTMLDivElement | null) => {
    if (node) {
      node.style.left = `${cursorPos.current.x}px`;
      node.style.top = `${cursorPos.current.y}px`;
    }
  };

  const getIconColor = (index: number) => {
    const isActive = hoveredIndex === index || clickedOrder.includes(index);
    return isActive ? techStack[index].color : IDLE_COLOR;
  };

  const renderIcon = (tech: TechItem, index: number) => (
    <TechIcon svgContent={tech.svgContent} color={getIconColor(index)} size={32} />
  );

  const handleClick = (index: number) => {
    // If this index isn't already in the clicked order, append it
    if (!clickedOrder.includes(index)) {
      setClickedOrder(prev => [...prev, index]);
    }

    // If there is an existing timer for this index, clear it so the timeout restarts
    const existing = timersRef.current.get(index);
    if (existing) {
      clearTimeout(existing);
      timersRef.current.delete(index);
    }

    // Set a timer to remove THIS index from clickedOrder after 5s
    const timer = setTimeout(() => {
      setClickedOrder(prev => prev.filter(i => i !== index));
      timersRef.current.delete(index);
    }, TECH_STACK_CLICK_TIMEOUT);
    timersRef.current.set(index, timer);
  };

  // cleanup on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // Local custom cursor — position is written straight to the DOM via refs so
  // moving the mouse never re-renders the icon grid.
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;
      setIsHoveringTechStack(isInside); // React bails out when the value is unchanged
      if (isInside) {
        cursorPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        placeCursor(cursorHaloRef.current);
        placeCursor(cursorDotRef.current);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getOrderNumber = (index: number) => {
    const position = clickedOrder.indexOf(index);
    return position !== -1 ? position + 1 : null;
  };

  return (
  <div ref={containerRef} className="relative grid cursor-none select-none grid-cols-4 gap-2 overflow-hidden" style={{ background: 'transparent' }}>
      {techStack.map((tech, index) => (
        <div
          key={tech.name}
          className="tech-card-wrapper"
          style={{ '--glow-color': tech.color } as React.CSSProperties}
        >
          <div
            className="tech-card group relative flex cursor-none flex-col items-center justify-center gap-2 rounded-lg border border-[color:var(--foreground)]/20 bg-neutral-50 dark:bg-[color:var(--background)] px-2 py-4 text-center shadow-2xs shadow-black/5 outline-offset-2 transition-[color,box-shadow,transform] duration-[140ms] ease-out hover:-translate-y-0.5 hover:cursor-none overflow-hidden has-data-[state=checked]:border-ring/30 has-data-[state=checked]:bg-accent sm:hover:bg-muted sm:has-data-[state=checked]:hover:bg-accent/70 sm:dark:hover:bg-muted/40"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => handleClick(index)}
          >
          {getOrderNumber(index) && (
            <div className="absolute top-1 left-1 z-20 text-[color:var(--foreground)]/70 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {getOrderNumber(index)}
            </div>
          )}
          <div className="relative z-10 flex items-center justify-center">
            <div
              className={`transition-all duration-300 ease-in-out ${
                hoveredIndex === index ? styles.bounceOnce : ""
              } ${styles.techCard}`}
              style={{
                '--card-transform': clickedOrder.includes(index) ? "translateY(-4px)" : "translateY(0px)",
                '--bounce-duration': `${TECH_STACK_BOUNCE_DURATION}ms`
              } as React.CSSProperties}
            >
              {renderIcon(tech, index)}
            </div>
          </div>
            <p className="relative z-10 text-[11px] opacity-80" style={{ color: "var(--foreground)" }}>
              {tech.name}
            </p>
          </div>
        </div>
      ))}      {/* Custom cursor for tech stack area */}
      {isHoveringTechStack && (
        <>
          <div
            ref={(n) => { cursorHaloRef.current = n; placeCursor(n); }}
            className="pointer-events-none absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 backdrop-blur-sm transition-all duration-200 ease-out"
            style={{
              backgroundColor: 'var(--cursor-halo-bg, rgba(255,255,255,0.1))',
              borderColor: 'var(--cursor-halo-border, rgba(255,255,255,0.3))'
            }}
          />
          <div
            ref={(n) => { cursorDotRef.current = n; placeCursor(n); }}
            className="pointer-events-none absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-150 ease-out"
            style={{
              backgroundColor: 'var(--cursor-dot-bg, white)'
            }}
          />
        </>
      )}
    </div>
  );
}
