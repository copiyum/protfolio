"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import styles from './styles.module.css';
import { DAILY_MESSAGES, DOW } from './constants';
import { addDays, dateKeyLocal, normalizeDate, sameDay, startOfWeek, setupResizeObserver } from './helpers';
import type { CalendarProps } from './types';
import useReducedMotion from '@/hooks/use-reduced-motion';

export default function Calendar({ selectedDate = new Date(), className = '', value, onChange }: CalendarProps) {
  const reducedMotion = useReducedMotion();
  const controlled = value instanceof Date;
  const baseDate = controlled ? value! : selectedDate;

  // Build week (Sun..Sat) containing baseDate
  const weekStart = useMemo(() => startOfWeek(baseDate), [baseDate]);
  const days = useMemo(() => [...Array(7)].map((_, i) => addDays(weekStart, i)), [weekStart]);

  // Today is fixed for the header
  const today = useMemo(() => normalizeDate(new Date()), []);
  const headerDayLabel = DOW[today.getDay()].slice(0, 3).replace(/^./, (c) => c.toUpperCase());
  // ponytail: pinned locale, not `undefined` — server/client locales differ → hydration mismatch
  const fullDateLabel = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Selection index
  const defaultIndex = Math.max(0, days.findIndex((d) => sameDay(d, today)));
  const [selectedIdx, setSelectedIdx] = useState(defaultIndex);

  // Moving overlay pill state and refs
  const [moving, setMoving] = useState(false);
  const weekRowRef = useRef<HTMLDivElement | null>(null);
  const overlayPillRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const contentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [overlayPos, setOverlayPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const prevSelectedRef = useRef<number>(defaultIndex);

  const computeOverlapRatio = useCallback((a: DOMRect, b: DOMRect) => {
    const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const overlap = x * y;
    const area = Math.max(1, b.width * b.height);
    return Math.max(0, Math.min(1, overlap / area));
  }, []);

  const updateGlow = useCallback(() => {
    const pill = overlayPillRef.current;
    const idx = selectedIdx;
    const btn = itemRefs.current[idx];
    const content = contentRefs.current[idx];
    if (!pill || !btn || !content) return;
    if (reducedMotion) {
      btn.style.setProperty('--glow-blur', '0px');
      return;
    }
    const pillRect = pill.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const ratio = computeOverlapRatio(pillRect, contentRect);
    const blur = 2 + ratio * 12; // px
    btn.style.setProperty('--glow-blur', `${blur.toFixed(2)}px`);
  }, [computeOverlapRatio, reducedMotion, selectedIdx]);

  const positionOverlayToIndex = useCallback((idx: number) => {
    const btnEl = itemRefs.current[idx];
    const pillEl = overlayPillRef.current;
    const rowEl = weekRowRef.current;
    if (!btnEl || !pillEl || !rowEl) return;
    const containerRect = rowEl.getBoundingClientRect();
    const btnRect = btnEl.getBoundingClientRect();

    const pillWidth = Math.max(32, Math.round(btnRect.width * 0.84));
    const pillHeight = Math.min(Math.round(btnRect.height), Math.round(btnRect.height * 0.85));

    pillEl.style.width = `${pillWidth}px`;
    pillEl.style.height = `${pillHeight}px`;

    const targetX = btnRect.left - containerRect.left + btnRect.width / 2 - pillWidth / 2;
    const targetY = btnRect.top - containerRect.top + btnRect.height / 2 - pillHeight / 2;

    setOverlayPos({ x: Math.round(targetX), y: Math.round(targetY) });
  }, []);

  // Initial position after first paint (without transition)
  useLayoutEffect(() => {
    const pill = overlayPillRef.current;
    if (pill) {
      const prev = pill.style.transition;
      pill.style.transition = 'none';
      positionOverlayToIndex(selectedIdx);
      // force reflow then restore transition
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      pill.offsetHeight;
      pill.style.transition = prev || '';
    } else {
      positionOverlayToIndex(selectedIdx);
    }
    setReady(true);
    if (reducedMotion) updateGlow();
    else requestAnimationFrame(updateGlow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  // Reposition overlay on selection changes
  useLayoutEffect(() => {
    if (reducedMotion) {
      positionOverlayToIndex(selectedIdx);
      updateGlow();
      return;
    }
    const id = requestAnimationFrame(() => {
      positionOverlayToIndex(selectedIdx);
      updateGlow();
    });
    return () => cancelAnimationFrame(id);
  }, [positionOverlayToIndex, reducedMotion, selectedIdx, updateGlow]);

  // Observe container resize for layout changes
  useEffect(() => {
    return setupResizeObserver(weekRowRef.current, () => positionOverlayToIndex(selectedIdx));
  }, [positionOverlayToIndex, selectedIdx]);

  // Animate glow while moving
  useEffect(() => {
    let raf: number;
    const tick = () => {
      updateGlow();
      raf = requestAnimationFrame(tick);
    };
    if (moving && !reducedMotion) {
      raf = requestAnimationFrame(tick);
    } else {
      updateGlow();
    }
    return () => cancelAnimationFrame(raf);
  }, [moving, reducedMotion, selectedIdx, updateGlow]);

  // Panel hover to reveal message
  const [panelHover, setPanelHover] = useState(false);
  const innerPanelClass = `${styles.innerPanel} ${panelHover ? styles.hasHover : ''}`.trim();

  const selected = days[selectedIdx];
  const msgDow = DOW[selected.getDay()];
  const message = DAILY_MESSAGES[msgDow];

  const isCompleted = normalizeDate(selected) < today;
  const selectedIsToday = sameDay(selected, today);

  const handleSelect = useCallback((idx: number, animate = true) => {
    setMoving(animate && !reducedMotion);
    setSelectedIdx(idx);
    const prev = itemRefs.current[prevSelectedRef.current];
    if (prev) prev.style.setProperty('--glow-blur', '0px');
    prevSelectedRef.current = idx;
    if (onChange) onChange(days[idx]);
  }, [days, onChange, reducedMotion]);

  // keyboard navigation: arrows + home/end
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const key = e.key;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
    e.preventDefault();
    if (key === 'ArrowLeft') handleSelect(Math.max(0, selectedIdx - 1), false);
    if (key === 'ArrowRight') handleSelect(Math.min(days.length - 1, selectedIdx + 1), false);
    if (key === 'Home') handleSelect(0, false);
    if (key === 'End') handleSelect(days.length - 1, false);
  }, [days.length, handleSelect, selectedIdx]);

  return (
    <div className={`${styles.outerBox} ${className}`.trim()}>
      <div
        className={innerPanelClass}
        onMouseEnter={() => setPanelHover(true)}
        onMouseLeave={() => setPanelHover(false)}
      >
        <div className={styles.panelHeader}>
          <div className={styles.headerLeft}>{headerDayLabel}</div>
          <div className={styles.headerRight}>{fullDateLabel}</div>
        </div>

        <div className={styles.messageBar} aria-hidden={!panelHover}>
          <div className={styles.messageRow}>
            <span className={`${styles.statusDot} ${isCompleted ? styles.dotFilled : styles.dotEmpty}`} />
            <span className={styles.messageText}>{message}</span>
          </div>
        </div>

        <div
          className={styles.weekRow}
          ref={weekRowRef}
          role="grid"
          aria-label="Week selector"
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          {days.map((d, idx) => {
            const isSelected = idx === selectedIdx;
            const dayNum = d.getDate();
            const dow = DOW[d.getDay()];
            const isToday = sameDay(d, today);

            const ariaLabel = `${dow}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` + (isToday ? ', Today' : '');

            return (
              <button
                type="button"
                className={`${styles.dayItem} ${isSelected ? styles.glowActive : ''}`}
                key={dateKeyLocal(d)}
                ref={(el) => { itemRefs.current[idx] = el; }}
                onClick={() => handleSelect(idx)}
                aria-selected={isSelected}
                aria-label={ariaLabel}
                role="gridcell"
              >
                <div ref={(el) => { contentRefs.current[idx] = el; }}>
                  <div className={`${styles.dayNum} ${isToday ? styles.todayText : ''}`}>{dayNum}</div>
                  <div className={`${styles.dow} ${isToday ? styles.todayText : ''}`}>{dow}</div>
                </div>
              </button>
            );
          })}
          <div className={styles.selectedOverlay}>
            <div
              ref={overlayPillRef}
              className={styles.overlayPill}
              style={{ transform: `translate3d(${overlayPos.x}px, ${overlayPos.y}px, 0)`, visibility: ready ? 'visible' : 'hidden' }}
              onTransitionEnd={() => setMoving(false)}
            >
              <div className={`${styles.selected} ${moving ? styles.moving : ''} ${selectedIsToday ? styles.today : ''}`.trim()} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
