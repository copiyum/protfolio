"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type Stroke = {
  color: string;
  width: number;
  erase?: boolean;
  points: Array<{ x: number; y: number }>;
};

export type DrawingCanvasHandle = {
  exportAsDataUrl: () => string;
  clear: () => void;
  undo: () => void;
  redo: () => void;
};

type Props = {
  color?: string;
  width?: number;
  erase?: boolean;
  className?: string;
  onChange?: (strokes: Stroke[]) => void;
};

type Point = { x: number; y: number };

const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(function DrawingCanvas(
  { color = "#000000", width = 3, erase = false, className, onChange },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);

  // Active-stroke scratch state lives in refs — drawing is done incrementally on
  // pointermove without React re-renders; committed history lives in `strokes`.
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const lastPointRef = useRef<Point | null>(null);

  const applyDpr = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawStroke = (s: Stroke) => {
    const ctx = ctxRef.current;
    if (!ctx || s.points.length === 0) return;
    ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  };

  // Draw only the latest segment of the active stroke — O(1) per pointer event.
  const drawSegment = (s: Stroke, from: Point, to: Point) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  };

  const redrawAll = (list: Stroke[]) => {
    const ctx = ctxRef.current;
    const c = canvasRef.current;
    if (!ctx || !c) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    applyDpr();
    for (const s of list) drawStroke(s);
  };

  // Keep the backing store in sync with container size and DPR.
  const resize = () => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
      redrawAll(strokes);
    }
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    ctxRef.current = c.getContext("2d");
    applyDpr();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    const onWinResize = () => resize();
    window.addEventListener("resize", onWinResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Committed history changed (commit/undo/redo/clear): repaint + notify.
  useEffect(() => {
    redrawAll(strokes);
    onChange?.(strokes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    const m = e as React.MouseEvent;
    return { x: m.clientX - rect.left, y: m.clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    const p = getPos(e);
    drawingRef.current = true;
    lastPointRef.current = p;
    // Snapshot the current props as this stroke's immutable style.
    currentStrokeRef.current = { color, width, erase, points: [p] };
    if (redoStack.length) setRedoStack([]);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current) return;
    const s = currentStrokeRef.current;
    const from = lastPointRef.current;
    if (!s || !from) return;
    const p = getPos(e);
    s.points.push(p);
    drawSegment(s, from, p);
    lastPointRef.current = p;
  };

  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const s = currentStrokeRef.current;
    currentStrokeRef.current = null;
    lastPointRef.current = null;
    // A bare click (no movement) leaves no mark, matching prior behavior.
    if (s && s.points.length > 1) setStrokes((prev) => [...prev, s]);
  };

  const clear = () => {
    setStrokes([]);
    setRedoStack([]);
  };

  const undo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const copy = prev.slice(0, -1);
      const popped = prev[prev.length - 1];
      setRedoStack((r) => [popped, ...r]);
      return copy;
    });
  };

  const redo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const [first, ...rest] = prev;
      setStrokes((s) => [...s, first]);
      return rest;
    });
  };

  const exportAsDataUrl = () => {
    const c = canvasRef.current;
    return c ? c.toDataURL("image/png") : "";
  };

  useImperativeHandle(ref, () => ({ exportAsDataUrl, clear, undo, redo }));

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        style={{ width: "100%", height: 300, touchAction: "none", display: "block", borderRadius: 12, background: "transparent" }}
      />
    </div>
  );
});

export default DrawingCanvas;
