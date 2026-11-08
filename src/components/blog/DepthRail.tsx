"use client";

import { useEffect, useState } from "react";
import type { ArticleHeading } from "@/lib/blog/plain-text";
import styles from "./article.module.css";

export function DepthRail({ headings }: { headings: ArticleHeading[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!headings.length || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        const index = headings.findIndex((heading) => heading.id === visible.target.id);
        if (index >= 0) setActive(index);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: 0 },
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (!headings.length) return null;
  const progress = headings.length === 1 ? 1 : active / (headings.length - 1);

  return (
    <nav aria-label="Article sections" className={styles.depthRail}>
      <div className={styles.depthLine} aria-hidden="true">
        <div className={styles.depthProgress} style={{ transform: `scaleY(${progress})` }} />
      </div>
      <ol className={styles.depthList}>
        {headings.map((heading, index) => {
          const isActive = index === active;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={styles.depthLink}
                data-active={isActive}
                aria-current={isActive ? "location" : undefined}
                aria-label={`${heading.marker ?? "Section"}: ${heading.text}`}
              >
                <span className={styles.depthDot} aria-hidden="true" />
                <span>{heading.marker ?? heading.text}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
