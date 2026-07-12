"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./styles.module.css";
import DrawingCanvas, { type DrawingCanvasHandle } from "./DrawingCanvas";
import type { Note } from "./types";
import { SimpleColorPicker } from "@/components/ui/shadcn-io/color-picker";
import HoldToSubmit from "@/components/ui/hold-to-submit";
import useReducedMotion from "@/hooks/use-reduced-motion";
import useHasMounted from "@/hooks/use-has-mounted";
import { InvisibleTurnstile, type InvisibleTurnstileHandle } from "@/components/admin/TurnstileWidget";

const COLORS = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#f97316", "#22d3ee", "#e5e7eb"];

const MODAL_EXIT_MS = 220;

function randomRotation() { return Math.round((Math.random() * 8 - 4) * 10) / 10; } // ±4° — controlled scatter, not chaos
function clampPercent(n:number){return Math.max(0, Math.min(100, n));}

const NoteCard = React.memo(function NoteCard({
  note,
  index,
  shuffling,
  onDrag,
  onNudge,
  onRotate,
}: {
  note: Note;
  index: number;
  shuffling: boolean;
  onDrag: (id: string, event: React.PointerEvent<HTMLDivElement>) => void;
  onNudge: (id: string, dx: number, dy: number) => void;
  onRotate: (id: string) => void;
}) {
  const style: React.CSSProperties = {
    left: `${note.x}%`,
    top: `${note.y}%`,
    transform: `translate(-50%, -50%) rotate(${note.rotation}deg)`,
    "--i": index,
  } as React.CSSProperties;
  const imageSrc = note.imageDataUrl ?? note.imageUrl;

  return (
    <div
      className={`${styles.card} ${shuffling ? styles.cardShuffling : ""}`}
      style={style}
      role="group"
      tabIndex={0}
      aria-label={`Doodle by ${note.name || "unknown"}. Use arrow keys to move it.`}
      onPointerDown={(event)=>onDrag(note.id, event)}
      onKeyDown={(event) => {
        const amount = event.shiftKey ? 5 : 2;
        const moves: Record<string, [number, number]> = {
          ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount],
        };
        const move = moves[event.key];
        if (!move) return;
        event.preventDefault();
        onNudge(note.id, move[0], move[1]);
      }}
    >
      <div className={styles.toolbar}>
        <button className={styles.iconBtn} aria-label={`Rotate doodle by ${note.name || "unknown"}`} onPointerDown={(event)=>event.stopPropagation()} onClick={(event)=>{event.stopPropagation(); onRotate(note.id);}}>↻</button>
      </div>
      <div className={styles.cardInner}>
        <div className={styles.drawPreview} style={{ borderBottomColor: note.color }}>
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageSrc} alt={`Doodle by ${note.name || "unknown"}`} draggable={false} onDragStart={(event)=>event.preventDefault()} style={{ width: "100%", height: "100%", objectFit: "contain", borderTopLeftRadius: 10, borderTopRightRadius: 10 }} />
          ) : null}
        </div>
        <div className={styles.meta}>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{note.name || "unknown"}</div>
          {note.message ? <div className={styles.msg}>{note.message}</div> : null}
        </div>
      </div>
    </div>
  );
});

export default function VisitorsBoard({
  initialNotes = [],
  sitekey = "",
  turnstileBypass = false,
}: {
  initialNotes?: Note[];
  sitekey?: string;
  turnstileBypass?: boolean;
}) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [draftColor, setDraftColor] = useState(COLORS[3]);
  const [draftName, setDraftName] = useState("");
  const [draftMsg, setDraftMsg] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const drawingRef = useRef<DrawingCanvasHandle | null>(null);
  const turnstileRef = useRef<InvisibleTurnstileHandle | null>(null);
  const modalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [brushWidth, setBrushWidth] = useState(4);
  const [erase, setErase] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const mounted = useHasMounted();
  const reducedMotion = useReducedMotion();
  const visibleNotes = mounted ? notes : [];
  const notesRef = useRef(notes);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    return () => {
      if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
    };
  }, []);

  // Drag logic per card
  const onDrag = useCallback((id: string, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault(); // stop native text-selection / image drag while moving the card
    if (e.button !== 0) return;
    const board = boardRef.current; if (!board) return;
    const card = e.currentTarget;
    const rect = board.getBoundingClientRect();
    const startX = e.clientX; const startY = e.clientY;
    const note = notesRef.current.find(n => n.id===id); if (!note) return;
    const orig = { x: note.x, y: note.y };
    let latest = orig;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX; const dy = ev.clientY - startY;
      const nx = orig.x + (dx/rect.width)*100;
      const ny = orig.y + (dy/rect.height)*100;
      latest = { x: clampPercent(nx), y: clampPercent(ny) };
      card.style.left = `${latest.x}%`;
      card.style.top = `${latest.y}%`;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setNotes(prev => prev.map(n => n.id===id ? { ...n, x: latest.x, y: latest.y } : n));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, []);

  const nudge = useCallback((id: string, dx: number, dy: number) => {
    setNotes((prev) => prev.map((note) => note.id === id ? {
      ...note,
      x: clampPercent(note.x + dx),
      y: clampPercent(note.y + dy),
    } : note));
  }, []);

  const shuffle = useCallback(() => {
    setShuffling(true);
    setNotes(prev => prev.map(n => ({
      ...n,
      x: clampPercent(Math.random() * 82 + 9),
      y: clampPercent(Math.random() * 72 + 8),
      rotation: randomRotation(),
    })));
    setTimeout(() => setShuffling(false), 600);
  }, []);

  const rotate = useCallback((id: string) => setNotes(prev=>prev.map(x=>x.id===id?{...x, rotation: randomRotation()}:x)), []);

  // Modal handlers
  const openModal = () => {
    setSubmitError(null);
    if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
    setModalOpen(true);
    if (reducedMotion) {
      setModalVisible(true);
      return;
    }
    requestAnimationFrame(() => setModalVisible(true));
  };

  const closeModal = useCallback(() => {
    setModalVisible(false);
    if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
    modalTimerRef.current = setTimeout(() => {
      setModalOpen(false);
      openerRef.current?.focus();
    }, reducedMotion ? 0 : MODAL_EXIT_MS);
  }, [reducedMotion]);

  useEffect(() => {
    if (!isModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>("button, input, textarea, [tabindex]:not([tabindex='-1'])")?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      )).filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeModal, isModalOpen]);

  const submit = async () => {
    if (isSubmitting) return;
    if (!drawingRef.current?.hasDrawing()) {
      setSubmitError("Draw something before submitting.");
      return;
    }
    const data = drawingRef.current?.exportAsDataUrl() || "";
    if (!data) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const token = turnstileBypass
        ? "playwright-turnstile-token"
        : await turnstileRef.current?.execute();
      if (!token) throw new Error("Human verification is not ready yet.");

      const response = await fetch("/api/visitor-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName,
          message: draftMsg,
          color: draftColor,
          imageDataUrl: data,
          cfTurnstileResponse: token,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { note?: Note; error?: string };
      if (!response.ok || !payload.note) {
        throw new Error(payload.error ?? "Could not save note.");
      }
      const savedNote = payload.note;
      setNotes((prev) => [...prev.filter((note) => note.id !== savedNote.id), savedNote]);
      setDraftMsg("");
      setDraftName("");
      drawingRef.current?.clear();
      closeModal();
    } catch (error) {
      turnstileRef.current?.reset();
      setSubmitError(error instanceof Error ? error.message : "Could not save note.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-center gap-4">
        <button
          ref={openerRef}
          className="px-4 py-2 rounded-lg bg-foreground text-background hover:opacity-90 hover:scale-[1.03] active:scale-95 transition-[opacity,transform] duration-[var(--motion-micro)] ease-[var(--ease-standard)] text-sm font-medium flex items-center gap-2"
          onClick={openModal}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Leave a note
        </button>
        <button
          className="inline-flex items-center gap-1.5 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
          onClick={shuffle}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Shuffle
        </button>
      </div>
      <div ref={boardRef} className={styles.board} aria-label="Visitor doodle board">
        <div className={styles.gridBg} />
        <div className={styles.empty} data-hidden={visibleNotes.length > 0 ? "true" : undefined} aria-hidden={visibleNotes.length > 0}>
            <div className={styles.ghostRow} aria-hidden>
              <span className={styles.ghost} style={{ transform: "rotate(-4deg)" }} />
              <span className={styles.ghost} style={{ transform: "rotate(2deg)" }} />
              <span className={styles.ghost} style={{ transform: "rotate(5deg)" }} />
            </div>
            <p className={styles.emptyText}>Be the first to leave a doodle.</p>
        </div>
        {visibleNotes.map((note, index) => (
          <NoteCard key={note.id} note={note} index={index} shuffling={shuffling} onDrag={onDrag} onNudge={nudge} onRotate={rotate} />
        ))}
      </div>

      {isModalOpen && mounted && createPortal(
        <div
          className={`${styles.modalBackdrop} ${isModalVisible ? styles.modalBackdropOpen : ""}`}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            ref={dialogRef}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="visitor-note-title"
          >
            <div className={styles.modalHeader}>
              <h2 id="visitor-note-title" className="text-sm opacity-80">Leave a note</h2>
              <button className="px-2 py-1 text-xs rounded-md border" onClick={closeModal} aria-label="Close visitor note dialog">Close</button>
            </div>
            <div className={styles.modalBody}>
              {/* Color Picker Section */}
              <SimpleColorPicker
                className="rounded-lg border bg-card/30 p-3"
                value={draftColor}
                onChange={setDraftColor}
              />

              {/* Drawing Canvas with Toolbar */}
              <div className={styles.canvasWrap}>
                {/* Toolbar */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {/* Undo */}
                    <button 
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md border bg-card/50 hover:bg-card transition-colors"
                      onClick={()=>drawingRef.current?.undo()}
                      aria-label="Undo drawing stroke"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                    {/* Redo */}
                    <button 
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md border bg-card/50 hover:bg-card transition-colors"
                      onClick={()=>drawingRef.current?.redo()}
                      aria-label="Redo drawing stroke"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                      </svg>
                    </button>
                    {/* Clear */}
                    <button 
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md border bg-card/50 hover:bg-card transition-colors"
                      onClick={()=>drawingRef.current?.clear()}
                      aria-label="Clear drawing"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md border bg-card/50 hover:bg-card transition-colors"
                      onClick={() => drawingRef.current?.addMark()}
                      aria-label="Add a mark without drawing"
                    >
                      <span className="size-2 rounded-full bg-current" aria-hidden />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Brush Size */}
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 opacity-70" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z"/>
                      </svg>
                      <div className="relative w-20">
                        <input 
                          aria-label="Brush size"
                          type="range" 
                          min={1} 
                          max={24} 
                          value={brushWidth}
                          onChange={(e)=>setBrushWidth(parseInt(e.target.value, 10))}
                          className={`w-full cursor-pointer ${styles.brushSlider}`}
                        />
                      </div>
                      <span className="min-w-[2ch] text-xs opacity-70">{brushWidth}</span>
                    </div>

                    {/* Eraser Toggle */}
                    <button 
                      type="button"
                      className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                        erase ? 'bg-foreground text-background' : 'bg-card/50 hover:bg-card'
                      }`}
                      onClick={()=>setErase((v)=>!v)}
                      aria-label="Eraser"
                      aria-pressed={erase}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 3.5L20.5 7.5L8.5 19.5L4.5 15.5L16.5 3.5Z M16.5 3.5L12.5 7.5 M20.5 7.5L16.5 11.5" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 15.5L1.5 18.5L6.5 20.5L8.5 17.5" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <DrawingCanvas ref={drawingRef} color={draftColor} width={brushWidth} erase={erase} />
              </div>

              {/* Form Section */}
              <div className="grid grid-cols-[auto_1fr] gap-3 items-center">
                <label htmlFor="visitor-name" className="text-sm font-medium opacity-80">Name</label>
                <input
                  id="visitor-name"
                  value={draftName}
                  onChange={(e)=>setDraftName(e.target.value)}
                  maxLength={40}
                  className="rounded-lg border bg-card/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/40"
                  placeholder="Your name"
                />
                <label htmlFor="visitor-message" className="text-sm font-medium opacity-80">Message</label>
                <textarea
                  id="visitor-message"
                  value={draftMsg}
                  onChange={(e)=>setDraftMsg(e.target.value)}
                  maxLength={140}
                  className="rounded-lg border bg-card/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/40"
                  placeholder="Leave a message..."
                  rows={2}
                />
              </div>
              {sitekey && !turnstileBypass ? (
                <InvisibleTurnstile
                  ref={turnstileRef}
                  sitekey={sitekey}
                  action="visitor-note"
                  onError={() => setSubmitError("Human verification could not load.")}
                />
              ) : null}
              {submitError ? (
                <p className="text-sm text-red-400" role="alert">{submitError}</p>
              ) : null}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="px-4 py-2 rounded-lg border hover:bg-[color:var(--foreground)]/5 transition-colors text-sm font-medium"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <HoldToSubmit onSubmit={submit} disabled={isSubmitting || (!sitekey && !turnstileBypass)} />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
