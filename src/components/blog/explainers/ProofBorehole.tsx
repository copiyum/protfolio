"use client";

import { useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import type { z } from "zod";
import useReducedMotion from "@/hooks/use-reduced-motion";
import type { ProofBoreholeDataSchema } from "@/lib/blog/document";
import styles from "../article.module.css";

type Data = z.infer<typeof ProofBoreholeDataSchema>;
type State = { scenario: number; stage: number };
type Action = { type: "scenario"; value: number } | { type: "stage"; value: number };
type Point = readonly [number, number];

function proofBoreholeReducer(state: State, action: Action): State {
  if (action.type === "scenario") return { scenario: action.value, stage: 0 };
  return { ...state, stage: action.value };
}

function segmentPath(from: Point, to: Point) {
  const middle = (from[1] + to[1]) / 2;
  return `M${from[0]} ${from[1]} C${from[0]} ${middle} ${to[0]} ${middle} ${to[0]} ${to[1]}`;
}

export function ProofBorehole({ data }: { data: Data }) {
  const [state, dispatch] = useReducer(proofBoreholeReducer, { scenario: 0, stage: 0 });
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const reducedMotion = useReducedMotion();
  const instanceId = useId().replace(/:/g, "");
  const titleId = `proof-title-${instanceId}`;
  const descriptionId = `proof-description-${instanceId}`;

  const scenario = data.scenarios[state.scenario] ?? data.scenarios[0];
  const stage = scenario.stages[state.stage] ?? scenario.stages[0];
  const stageCount = scenario.stages.length;
  const diagramHeight = Math.max(310, 108 + (stageCount - 1) * 78);
  const positions = useMemo<Point[]>(() => {
    const top = 54;
    const bottom = diagramHeight - 54;
    return scenario.stages.map((_, index) => {
      const progress = stageCount === 1 ? 0 : index / (stageCount - 1);
      return [170 + progress * 350, top + progress * (bottom - top)] as const;
    });
  }, [diagramHeight, scenario.stages, stageCount]);
  const segments = positions.slice(1).map((point, index) => segmentPath(positions[index], point));

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

  function selectScenario(index: number) {
    clearRun();
    setHasRun(false);
    dispatch({ type: "scenario", value: index });
  }

  function selectStage(index: number) {
    clearRun();
    setHasRun(false);
    dispatch({ type: "stage", value: index });
  }

  function runTrace() {
    clearRun();
    setRunning(true);
    setHasRun(true);
    dispatch({ type: "stage", value: 0 });

    if (reducedMotion) {
      dispatch({ type: "stage", value: stageCount - 1 });
      setRunning(false);
      return;
    }

    for (let index = 1; index < stageCount; index += 1) {
      timers.current.push(
        setTimeout(() => dispatch({ type: "stage", value: index }), index * 300),
      );
    }
    timers.current.push(setTimeout(() => setRunning(false), stageCount * 300));
  }

  const packetPosition = positions[state.stage] ?? positions[0];

  return (
    <figure className={styles.proofFigure}>
      <header className={styles.figureBar}>
        <span className={styles.figureLabel}>Trace · the proof borehole</span>
        <div className={styles.controlGroup} role="group" aria-label="Diagram scenario">
          {data.scenarios.map((item, index) => {
            const selected = index === state.scenario;
            return (
              <button
                key={`${index}-${item.label}`}
                type="button"
                aria-pressed={selected}
                onClick={() => selectScenario(index)}
                className={styles.figureButton}
                data-active={selected}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className={styles.proofGrid} aria-busy={running}>
        <aside className={styles.proofAside}>
          <div>
            <strong className={styles.proofMetric}>
              {String(state.stage + 1).padStart(2, "0")}
            </strong>
            <span className={styles.proofUnit}>of {stageCount} layers</span>
          </div>
          <p className={styles.proofVerdict}>{scenario.verdict}</p>
          <button
            type="button"
            onClick={runTrace}
            disabled={running}
            className={styles.runButton}
          >
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="m3 1.8 7 4.2-7 4.2V1.8Z" />
            </svg>
            {running ? "tracing…" : hasRun ? "run again" : "run trace"}
          </button>
        </aside>

        <div className={styles.proofVisual}>
          <svg
            viewBox={`0 0 700 ${diagramHeight}`}
            className={`${styles.diagramSvg} ${styles.proofSvg}`}
            role="img"
            aria-labelledby={`${titleId} ${descriptionId}`}
          >
            <title id={titleId}>{`Evidence descending through ${stageCount} boundaries`}</title>
            <desc id={descriptionId}>
              Select a stage to inspect how the claim gains evidence through the system.
            </desc>

            <g aria-hidden="true">
              {positions.map(([, y], index) => (
                <g key={`${index}-${scenario.stages[index].name}`}>
                  <line className={styles.svgRule} x1="64" y1={y} x2="682" y2={y} />
                  <text className={styles.proofDepth} x="0" y={y + 4}>
                    {scenario.stages[index].depth ?? `L${String(index + 1).padStart(2, "0")}`}
                  </text>
                </g>
              ))}
            </g>

            <path className={styles.svgRoute} d={segments.join(" ")} />
            {segments.map((path, index) => (
              <path
                key={path}
                className={`${styles.svgRouteSegment} ${
                  index < state.stage ? styles.svgRouteSegmentVisible : ""
                } ${index === state.stage - 1 ? styles.svgRouteSegmentActive : ""}`}
                d={path}
              />
            ))}

            {scenario.stages.map((item, index) => {
              const [x, y] = positions[index];
              const active = index === state.stage;
              const past = index < state.stage;
              return (
                <g
                  key={`${index}-${item.name}`}
                  className={`${past ? styles.proofStagePast : ""} ${
                    active ? styles.proofStageActive : ""
                  }`}
                >
                  <circle className={styles.proofPin} cx={x} cy={y} r="7" />
                  <circle className={styles.proofCore} cx={x} cy={y} r="2.4" />
                  <text className={styles.proofName} x="82" y={y - 6}>
                    {item.name}
                  </text>
                  <text className={styles.proofEvidence} x="82" y={y + 12}>
                    evidence {String(index + 1).padStart(2, "0")}
                  </text>
                  <text className={styles.proofStageIndex} x="676" y={y + 4} textAnchor="end">
                    {active ? "current" : past ? "passed" : "waiting"}
                  </text>
                </g>
              );
            })}

            <g
              className={styles.proofPacket}
              aria-hidden="true"
              style={{ transform: `translate(${packetPosition[0]}px, ${packetPosition[1]}px)` }}
            >
              <circle r="6" />
              <line x1="-2" x2="2" />
              <line y1="-2" y2="2" />
            </g>
          </svg>

          <div className={styles.proofSteps} role="group" aria-label="Inspect request stage">
            {scenario.stages.map((item, index) => {
              const selected = index === state.stage;
              return (
                <button
                  key={`${index}-${item.name}`}
                  type="button"
                  onClick={() => selectStage(index)}
                  aria-pressed={selected}
                  className={styles.proofStep}
                  data-active={selected}
                >
                  <strong>{item.name}</strong>
                  <span>{item.depth ?? `Layer ${index + 1}`}</span>
                </button>
              );
            })}
          </div>
          <p className={styles.mobileDiagramNote}>
            The diagram keeps its authored proportions; swipe it horizontally on small screens.
          </p>
        </div>
      </div>

      <div className={styles.explainerStatus} role="status" aria-live="polite">
        <span className={styles.explainerKicker}>Current evidence</span>
        <span>
          <strong>{stage.name}.</strong> {stage.detail}
        </span>
      </div>
      <figcaption className={styles.figureCaption}>
        <span>{data.caption}</span>
        <span>{scenario.label}</span>
      </figcaption>
    </figure>
  );
}
