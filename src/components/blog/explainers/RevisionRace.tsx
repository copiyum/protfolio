"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { z } from "zod";
import useReducedMotion from "@/hooks/use-reduced-motion";
import type { RevisionRaceDataSchema } from "@/lib/blog/document";
import styles from "../article.module.css";

type Data = z.infer<typeof RevisionRaceDataSchema>;
type RaceControl = "play" | "conflict" | "retry" | null;

export function RevisionRace({ data }: { data: Data }) {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [activeControl, setActiveControl] = useState<RaceControl>(null);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const reducedMotion = useReducedMotion();
  const instanceId = useId().replace(/:/g, "");
  const titleId = `race-title-${instanceId}`;
  const descriptionId = `race-description-${instanceId}`;
  const arrowId = `race-arrow-${instanceId}`;
  const initial = data.initialRevision;
  const next = initial + 1;
  const retry = initial + 2;

  const states = [
    {
      revision: initial,
      a: `read ${initial}`,
      b: `read ${initial}`,
      title: "One known truth.",
      text: `Both tabs currently agree that revision ${initial} is durable.`,
    },
    {
      revision: initial,
      a: `sent ${initial}`,
      b: `sent ${initial}`,
      title: "Two valid-looking claims.",
      text: "Both tabs submit before either response returns.",
    },
    {
      revision: next,
      a: `saved ${next}`,
      b: "waiting",
      title: "A establishes the next truth.",
      text: `The first conditional update advances the durable record to revision ${next}.`,
    },
    {
      revision: next,
      a: `saved ${next}`,
      b: "refresh needed",
      title: "B is stale, not slow.",
      text: `Its revision ${initial} predicate matches zero rows, so the interface cannot call it saved.`,
    },
    {
      revision: retry,
      a: `saved ${next}`,
      b: `saved ${retry}`,
      title: "Retry starts from truth.",
      text: `B reads revision ${next}, reapplies the intended change, and commits revision ${retry}.`,
    },
  ] as const;
  const current = states[step] ?? states[0];

  function clearRun() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(false);
  }

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  function playRace() {
    clearRun();
    setStep(0);
    setRunning(true);
    setActiveControl("play");

    if (reducedMotion) {
      setStep(4);
      setRunning(false);
      setActiveControl(null);
      return;
    }

    [1, 2, 3, 4].forEach((nextStep, index) => {
      timers.current.push(setTimeout(() => setStep(nextStep), (index + 1) * 300));
    });
    timers.current.push(
      setTimeout(() => {
        setRunning(false);
        setActiveControl(null);
      }, 1380),
    );
  }

  function showStep(nextStep: 3 | 4, control: Exclude<RaceControl, "play" | null>) {
    clearRun();
    setStep(nextStep);
    setActiveControl(control);
  }

  const eventClass = (eventStep: number, conflict = false) =>
    `${styles.diagramEvent} ${eventStep <= step ? styles.diagramEventVisible : ""} ${
      eventStep === step ? styles.diagramEventActive : ""
    } ${conflict ? styles.raceConflict : ""}`;

  return (
    <figure className={styles.raceFigure}>
      <header className={styles.figureBar}>
        <span className={styles.figureLabel}>Evidence · {data.title}</span>
        <div className={styles.controlGroup} role="group" aria-label="Revision race view">
          <button
            type="button"
            onClick={playRace}
            disabled={running}
            aria-pressed={activeControl === "play"}
            className={styles.figureButton}
            data-active={activeControl === "play"}
          >
            {running ? "playing…" : "play race"}
          </button>
          <button
            type="button"
            onClick={() => showStep(3, "conflict")}
            aria-pressed={activeControl === "conflict"}
            className={styles.figureButton}
            data-active={activeControl === "conflict"}
          >
            show conflict
          </button>
          <button
            type="button"
            onClick={() => showStep(4, "retry")}
            aria-pressed={activeControl === "retry"}
            className={styles.figureButton}
            data-active={activeControl === "retry"}
          >
            show retry
          </button>
        </div>
      </header>

      <div className={styles.explainerShell} aria-busy={running}>
        <div className={styles.explainerCanvas}>
          <svg
            className={`${styles.diagramSvg} ${styles.raceSvg}`}
            viewBox="0 0 760 330"
            role="img"
            aria-labelledby={`${titleId} ${descriptionId}`}
          >
            <title id={titleId}>Two browser tabs racing to update one revision</title>
            <desc id={descriptionId}>
              Both tabs read revision {initial}. Tab A commits revision {next}; Tab B is rejected
              as stale, reads the new truth, and retries as revision {retry}.
            </desc>
            <defs>
              <marker
                id={arrowId}
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path className={styles.arrowHead} d="M0 0 8 4 0 8Z" />
              </marker>
            </defs>

            <text className={styles.raceLaneLabel} x="120" y="25" textAnchor="middle">
              Tab A
            </text>
            <text className={styles.raceLaneLabel} x="380" y="25" textAnchor="middle">
              Action + D1
            </text>
            <text className={styles.raceLaneLabel} x="640" y="25" textAnchor="middle">
              Tab B
            </text>
            <text className={styles.raceLaneNote} x="120" y="43" textAnchor="middle">
              {current.a}
            </text>
            <text className={styles.raceLaneNote} x="380" y="43" textAnchor="middle">
              compare + commit
            </text>
            <text className={styles.raceLaneNote} x="640" y="43" textAnchor="middle">
              {current.b}
            </text>
            <line className={styles.svgLane} x1="120" y1="56" x2="120" y2="314" />
            <line className={styles.svgLane} x1="380" y1="56" x2="380" y2="314" />
            <line className={styles.svgLane} x1="640" y1="56" x2="640" y2="314" />

            <g className={styles.raceRevision}>
              <rect x="339" y="58" width="82" height="28" rx="4" />
              <text x="380" y="76" textAnchor="middle">
                revision {current.revision}
              </text>
            </g>

            <g className={eventClass(1)}>
              <path d="M120 104 C205 104 286 113 372 120" markerEnd={`url(#${arrowId})`} />
              <path d="M640 136 C548 136 472 138 388 138" markerEnd={`url(#${arrowId})`} />
              <circle className={styles.eventDot} cx="120" cy="104" r="4" />
              <circle className={styles.eventDot} cx="640" cy="136" r="4" />
              <text x="164" y="96">
                name = Sarang · rev {initial}
              </text>
              <text x="596" y="154" textAnchor="end">
                bio = builder · rev {initial}
              </text>
            </g>
            <g className={eventClass(2)}>
              <path d="M372 180 C290 180 212 184 128 184" markerEnd={`url(#${arrowId})`} />
              <circle className={styles.eventDot} cx="380" cy="180" r="4" />
              <text x="250" y="172">
                1 row · commit {next}
              </text>
            </g>
            <g className={eventClass(3, true)}>
              <path d="M388 226 C474 226 554 232 632 232" markerEnd={`url(#${arrowId})`} />
              <circle className={styles.eventDot} cx="380" cy="226" r="4" />
              <text x="510" y="218">
                0 rows · stale {initial}
              </text>
            </g>
            <g className={eventClass(4)}>
              <path d="M640 270 C554 270 470 276 388 282" markerEnd={`url(#${arrowId})`} />
              <path d="M388 302 C476 302 554 304 632 304" markerEnd={`url(#${arrowId})`} />
              <circle className={styles.eventDot} cx="640" cy="270" r="4" />
              <circle className={styles.eventDot} cx="380" cy="302" r="4" />
              <text x="510" y="265">
                read {next} · reapply
              </text>
              <text x="510" y="322">
                commit {retry}
              </text>
            </g>
            <text className={styles.proofDepth} x="10" y="108">
              t1
            </text>
            <text className={styles.proofDepth} x="10" y="184">
              t2
            </text>
            <text className={styles.proofDepth} x="10" y="232">
              t3
            </text>
            <text className={styles.proofDepth} x="10" y="306">
              t4
            </text>
          </svg>
          <p className={styles.mobileDiagramNote}>Swipe the timeline horizontally on small screens.</p>
        </div>
        <div className={styles.explainerStatus} role="status" aria-live="polite">
          <span className={styles.explainerKicker}>Race state</span>
          <span>
            <strong>{current.title}</strong> {current.text}
          </span>
        </div>
      </div>
      <figcaption className={styles.figureCaption}>
        <span>{data.caption}</span>
        <span>Inline SVG · discrete evidence states</span>
      </figcaption>
    </figure>
  );
}
