"use client";

import React, { useEffect, useRef } from "react";
import styles from "./interactive-showcase.module.css";
import useReducedMotion from "@/hooks/use-reduced-motion";

const SPRING = 0.12; // snappier spring
const DEFAULT_Y = 0.5;

export default function InteractiveShowcase() {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const targetRef = useRef(DEFAULT_Y); // cursor target (0..1)
	const clipRef = useRef(DEFAULT_Y); // smoothed "water surface"
	const frameRef = useRef<number | null>(null);
	const reducedMotion = useReducedMotion();

	const writeClip = (value: number) => {
		containerRef.current?.style.setProperty("--clip-y", `${value * 100}%`);
	};

	const settleClip = () => {
		if (reducedMotion) {
			clipRef.current = targetRef.current;
			writeClip(clipRef.current);
			return;
		}
		if (frameRef.current !== null) return;
		const tick = () => {
			clipRef.current += (targetRef.current - clipRef.current) * SPRING;
			writeClip(clipRef.current);
			if (Math.abs(targetRef.current - clipRef.current) > 0.001) {
				frameRef.current = requestAnimationFrame(tick);
			} else {
				clipRef.current = targetRef.current;
				writeClip(clipRef.current);
				frameRef.current = null;
			}
		};
		frameRef.current = requestAnimationFrame(tick);
	};

	useEffect(() => {
		if (reducedMotion && frameRef.current !== null) {
			cancelAnimationFrame(frameRef.current);
			frameRef.current = null;
		}
		return () => {
			if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
		};
	}, [reducedMotion]);

	const updateFromPointer = (clientY: number) => {
		const el = containerRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
		targetRef.current = y / rect.height;
		settleClip();
	};

	return (
		<div
			ref={containerRef}
			className="group relative h-[260px] w-full overflow-hidden rounded-[18px] bg-[color:var(--background)]/72 p-4"
			style={{ "--clip-y": "50%" } as React.CSSProperties}
			onMouseMove={(e) => updateFromPointer(e.clientY)}
			onMouseLeave={() => {
				targetRef.current = DEFAULT_Y;
				settleClip();
			}}
		>
			{/* Inner card holds the text + water reveal. The lavender corner accents
			    sit AT this card's corners — only the four corners have a rounded
			    lavender border, the rest of the edge stays as the thin /8 base. */}
			<div className="relative h-full flex items-center justify-center">
				<div className="flex w-full items-center justify-center">
					<div className="relative h-[190px] w-full overflow-hidden rounded-xl border border-[color:var(--foreground)]/8 bg-[color:var(--foreground)]/[0.015]">
						{/* Lavender corner pieces — only at the four corners of this card.
						    Subtle by default, fully lit + glowing on hover (parent has .group). */}
						<div className={styles.cornerFrame} aria-hidden>
							<span className={`${styles.cornerP} ${styles.topLeft}`} />
							<span className={`${styles.cornerP} ${styles.topRight}`} />
							<span className={`${styles.cornerP} ${styles.bottomLeft}`} />
							<span className={`${styles.cornerP} ${styles.bottomRight}`} />
						</div>

						{/* Inner clipped content container */}
						<div className="absolute inset-0 overflow-hidden flex items-center justify-center">
							{/* Base text (split into two lines) */}
							<h3 className="font-mono text-sm text-[color:var(--foreground)] select-none text-center leading-snug">
								I like to make
								<br /> things interactive.
							</h3>

							{/* Glowing stroked text (only below the line) — inherits --clip-y from the container */}
							<h3
								className={`absolute inset-0 flex flex-col items-center justify-center font-mono text-sm text-transparent select-none text-center leading-snug ${styles.glowingText}`}
							>
								<span className="block">I like to make</span>
								<span className="block">things interactive.</span>
							</h3>

							{/* Blue glowing "water fill" below the line with gradient */}
							<div
								className={`absolute left-0 right-0 ${styles.waterFill}`}
								style={{ top: "var(--clip-y)", bottom: 0 }}
							/>

							{/* Floating water line */}
							<div
								className={`absolute left-0 right-0 h-[2px] ${styles.waterLine}`}
								style={{ top: "var(--clip-y)" }}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
