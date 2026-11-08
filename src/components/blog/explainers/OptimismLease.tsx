"use client";

import { useId, useState } from "react";
import type { z } from "zod";
import type { OptimismLeaseDataSchema } from "@/lib/blog/document";
import styles from "../article.module.css";

type Data = z.infer<typeof OptimismLeaseDataSchema>;
type LeaseState = "idle" | "pending" | "confirmed" | "corrected";

export function OptimismLease({ data }: { data: Data }) {
  const [state, setState] = useState<LeaseState>("idle");
  const instanceId = useId().replace(/:/g, "");
  const titleId = `lease-title-${instanceId}`;
  const descriptionId = `lease-description-${instanceId}`;
  const statuses: Record<LeaseState, { title: string; text: string }> = {
    idle: {
      title: "Known.",
      text: "The interface and durable record both say Mira.",
    },
    pending: {
      title: "Pending.",
      text: `The interface shows Sarang as a temporary ${data.ttlSeconds}-second claim while the durable record still says Mira.`,
    },
    confirmed: {
      title: "Confirmed.",
      text: "The committed record returns and both tracks can honestly say Sarang.",
    },
    corrected: {
      title: "Corrected.",
      text: "The write was rejected, so the interface returns to Mira and exposes the reason.",
    },
  };
  const current = statuses[state];
  const stateClass = (name: LeaseState) =>
    `${styles.leaseState} ${state === name ? styles.leaseStateVisible : ""}`;

  return (
    <figure className={styles.leaseFigure}>
      <header className={styles.figureBar}>
        <span className={styles.figureLabel}>Return · {data.title}</span>
        <div className={styles.controlGroup} role="group" aria-label="Optimistic interface state">
          {(
            [
              ["idle", "reset"],
              ["pending", "show intent"],
              ["confirmed", "confirm"],
              ["corrected", "reject"],
            ] as const
          ).map(([name, label]) => (
            <button
              key={name}
              type="button"
              onClick={() => setState(name)}
              aria-pressed={state === name}
              className={styles.figureButton}
              data-active={state === name}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.explainerShell}>
        <div className={styles.explainerCanvas}>
          <svg
            className={`${styles.diagramSvg} ${styles.leaseSvg}`}
            viewBox="0 0 760 286"
            role="img"
            aria-labelledby={`${titleId} ${descriptionId}`}
          >
            <title id={titleId}>Interface truth compared with durable server truth</title>
            <desc id={descriptionId}>
              The interface may temporarily show Sarang while the server still stores Mira. A
              confirmation makes both agree on Sarang; rejection corrects the interface to Mira.
            </desc>

            <text className={styles.leaseAxisLabel} x="18" y="102">
              Interface
            </text>
            <text className={styles.leaseAxisLabel} x="18" y="202">
              Durable record
            </text>
            <text className={styles.leaseTime} x="168" y="35" textAnchor="middle">
              t0 · known
            </text>
            <text className={styles.leaseTime} x="390" y="35" textAnchor="middle">
              t1 · intent
            </text>
            <text className={styles.leaseTime} x="610" y="35" textAnchor="middle">
              t2 · result
            </text>
            <line className={styles.svgRule} x1="168" y1="45" x2="168" y2="234" />
            <line className={styles.svgRule} x1="390" y1="45" x2="390" y2="234" />
            <line className={styles.svgRule} x1="610" y1="45" x2="610" y2="234" />
            <line className={styles.leaseTrack} x1="112" y1="100" x2="696" y2="100" />
            <line className={styles.leaseTrack} x1="112" y1="200" x2="696" y2="200" />

            <g className={stateClass("idle")}>
              <line className={styles.leaseTrack} x1="168" y1="100" x2="168" y2="200" />
              <rect className={styles.leaseChip} x="132" y="79" width="72" height="42" rx="4" />
              <text className={styles.leaseChipLabel} x="168" y="98" textAnchor="middle">
                Mira
              </text>
              <text className={styles.leaseChipNote} x="168" y="112" textAnchor="middle">
                known
              </text>
              <rect className={styles.leaseChip} x="132" y="179" width="72" height="42" rx="4" />
              <text className={styles.leaseChipLabel} x="168" y="198" textAnchor="middle">
                Mira
              </text>
              <text className={styles.leaseChipNote} x="168" y="212" textAnchor="middle">
                durable
              </text>
            </g>

            <g className={stateClass("pending")}>
              <path className={`${styles.leaseTrack} ${styles.leaseTrackAccent}`} d="M168 100 C246 100 312 100 390 100" />
              <path className={styles.leaseTrack} d="M168 200 C246 200 312 200 390 200" />
              <line className={`${styles.leaseTrack} ${styles.leaseTrackDashed}`} x1="390" y1="122" x2="390" y2="178" />
              <rect className={`${styles.leaseChip} ${styles.leaseChipAccent}`} x="340" y="79" width="100" height="42" rx="4" />
              <text className={styles.leaseChipLabel} x="390" y="98" textAnchor="middle">
                Sarang
              </text>
              <text className={styles.leaseChipNote} x="390" y="112" textAnchor="middle">
                pending
              </text>
              <rect className={styles.leaseChip} x="350" y="179" width="80" height="42" rx="4" />
              <text className={styles.leaseChipLabel} x="390" y="198" textAnchor="middle">
                Mira
              </text>
              <text className={styles.leaseChipNote} x="390" y="212" textAnchor="middle">
                still true
              </text>
            </g>

            <g className={stateClass("confirmed")}>
              <path className={`${styles.leaseTrack} ${styles.leaseTrackAccent}`} d="M168 100 C310 100 468 100 610 100" />
              <path className={`${styles.leaseTrack} ${styles.leaseTrackAccent}`} d="M168 200 C310 200 468 200 610 200" />
              <line className={`${styles.leaseTrack} ${styles.leaseTrackAccent}`} x1="610" y1="122" x2="610" y2="178" />
              <rect className={`${styles.leaseChip} ${styles.leaseChipAccent}`} x="560" y="79" width="100" height="42" rx="4" />
              <text className={styles.leaseChipLabel} x="610" y="98" textAnchor="middle">
                Sarang
              </text>
              <text className={styles.leaseChipNote} x="610" y="112" textAnchor="middle">
                confirmed
              </text>
              <rect className={`${styles.leaseChip} ${styles.leaseChipAccent}`} x="560" y="179" width="100" height="42" rx="4" />
              <text className={styles.leaseChipLabel} x="610" y="198" textAnchor="middle">
                Sarang
              </text>
              <text className={styles.leaseChipNote} x="610" y="212" textAnchor="middle">
                durable
              </text>
            </g>

            <g className={stateClass("corrected")}>
              <path className={`${styles.leaseTrack} ${styles.leaseTrackAccent}`} d="M168 100 C258 100 320 100 390 100" />
              <path className={`${styles.leaseTrack} ${styles.leaseTrackDashed}`} d="M390 100 C470 54 526 146 610 100" />
              <path className={styles.leaseTrack} d="M168 200 C310 200 468 200 610 200" />
              <line className={styles.leaseTrack} x1="610" y1="122" x2="610" y2="178" />
              <rect className={styles.leaseChip} x="560" y="79" width="100" height="42" rx="4" />
              <text className={styles.leaseChipLabel} x="610" y="98" textAnchor="middle">
                Mira
              </text>
              <text className={styles.leaseChipNote} x="610" y="112" textAnchor="middle">
                corrected
              </text>
              <rect className={styles.leaseChip} x="560" y="179" width="100" height="42" rx="4" />
              <text className={styles.leaseChipLabel} x="610" y="198" textAnchor="middle">
                Mira
              </text>
              <text className={styles.leaseChipNote} x="610" y="212" textAnchor="middle">
                durable
              </text>
            </g>

            <text className={styles.proofEvidence} x="696" y="257" textAnchor="end">
              displayed claim ≠ durable fact
            </text>
          </svg>
          <p className={styles.mobileDiagramNote}>Swipe the truth tracks horizontally on small screens.</p>
        </div>
        <div className={styles.explainerStatus} role="status" aria-live="polite">
          <span className={styles.explainerKicker}>Truth state</span>
          <span>
            <strong>{current.title}</strong> {current.text}
          </span>
        </div>
      </div>
      <figcaption className={styles.figureCaption}>
        <span>{data.caption}</span>
        <span>Inline SVG · data-driven states</span>
      </figcaption>
    </figure>
  );
}
