"use client";

import React, { useMemo } from "react";
import { JSX } from "react";
import styles from "./text-highlights.module.css";

type Range = { start: number; end: number };

interface TextHighlightsProps {
  text: string;
  highlights?: string[];
  active?: boolean;
  dimOthers?: boolean;
  className?: string;
}

// Find all case-insensitive ranges for the given highlight substrings.
function findRanges(text: string, highlights?: string[]) {
  if (!highlights || highlights.length === 0) return [] as Range[];
  const hay = text.toLowerCase();
  const ranges: Range[] = [];
  for (const needleRaw of highlights) {
    const needle = (needleRaw ?? "").toLowerCase();
    if (!needle) continue;
    let idx = 0;
    while (true) {
      const found = hay.indexOf(needle, idx);
      if (found === -1) break;
      ranges.push({ start: found, end: found + needle.length });
      idx = found + needle.length;
    }
  }
  // merge overlapping
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Range[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (!last || r.start > last.end) merged.push({ ...r });
    else last.end = Math.max(last.end, r.end);
  }
  return merged;
}

function renderWithHighlights(text: string, ranges: Range[], active: boolean, dimOthers: boolean) {
  let last = 0;
  const parts: JSX.Element[] = [];

  ranges.forEach((r, i) => {
    if (last < r.start) {
      parts.push(
        <span
          key={`n-${i}`}
          className={active && dimOthers ? styles.dimmed : ""}
        >
          {text.slice(last, r.start)}
        </span>
      );
    }
    parts.push(
      <span
        key={`h-${i}`}
        className={active ? styles.highlight : ""}
      >
        {text.slice(r.start, r.end)}
      </span>
    );
    last = r.end;
  });

  if (last < text.length) {
    parts.push(
      <span
        key="tail"
        className={active && dimOthers ? styles.dimmed : ""}
      >
        {text.slice(last)}
      </span>
    );
  }

  return parts;
}

export default function TextHighlights({ text, highlights, active = false, dimOthers = true, className }: TextHighlightsProps) {
  const ranges = useMemo(() => findRanges(text, highlights), [text, highlights]);

  return (
    <span className={className}>
      {renderWithHighlights(text, ranges, active, dimOthers)}
    </span>
  );
}
