"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./TypingSimulator.module.css";
import caretStyles from "./caret.module.css";
import { generatePassage } from "@/lib/typing/passage";
import { computeAccuracy, computeWpm } from "@/lib/typing/metrics";
import { hideLeadingSpacesAndGetActive } from "@/lib/typing/layout";
import { useFloatingCaret } from "./useFloatingCaret";
import { HUD } from "./HUD";
import { StartOverlay } from "./StartOverlay";
import { ResultOverlay } from "./ResultOverlay";
import { Mascot } from "./Mascot";

const MASCOT_FRAMES = [
	"/assets/bongo-cat/none.png",
	"/assets/bongo-cat/left.png",
	"/assets/bongo-cat/right.png",
];

const TRAIL_LEN = 6; // number of trailing glow characters

export default function TypingSimulator() {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const caretRef = useRef<HTMLSpanElement | null>(null);
	const ghostRef = useRef<HTMLSpanElement | null>(null);
	const ghostConnectorRef = useRef<HTMLSpanElement | null>(null);
	const lineRef = useRef<HTMLDivElement | null>(null);
	const [ready, setReady] = useState(false);
	const [target, setTarget] = useState<string>("");
	const [typed, setTyped] = useState<string>("");
	const [startedAt, setStartedAt] = useState<number | null>(null);
	const [finished, setFinished] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [mascotFrame, setMascotFrame] = useState(0);
	const frameTimeout = useRef<number | null>(null);
	const [reducedMotion, setReducedMotion] = useState(false);

	// reduced motion preference
	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReducedMotion(mq.matches);
		const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	// derived stats
	const correctCount = useMemo(() => {
		let c = 0;
		for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) c++;
		return c;
	}, [typed, target]);
	const [finalStats, setFinalStats] = useState<{ wpm: number; acc: number } | null>(null);
	const liveWpm = computeWpm(correctCount, startedAt);
	const liveAcc = computeAccuracy(correctCount, typed.length);
	const wpm = finalStats ? finalStats.wpm : liveWpm;
	const accuracy = finalStats ? finalStats.acc : liveAcc;

	// initial focus — preventScroll so the page doesn't jump down to the sim on load
	useEffect(() => {
		containerRef.current?.focus({ preventScroll: true });
	}, []);

	const handleStart = () => {
		if (ready) return;
		let seed = Date.now();
		try {
			const u32 = new Uint32Array(1);
			window.crypto.getRandomValues(u32);
			seed = u32[0] || seed;
		} catch {}
		setTarget(generatePassage(seed));
		setReady(true);
		requestAnimationFrame(() => containerRef.current?.focus({ preventScroll: true }));
	};

	const pulseMascot = () => {
		if (reducedMotion) return;
		// alternate left(1)/right(2) paws per keystroke; rest to none(0) when typing pauses
		setMascotFrame((f) => (f === 1 ? 2 : 1));
		if (frameTimeout.current) window.clearTimeout(frameTimeout.current);
		frameTimeout.current = window.setTimeout(() => setMascotFrame(0), 180);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (!ready) return;
		if (e.key === "Tab") {
			e.preventDefault();
			triggerReset();
			return;
		}
		if (e.key === "Backspace") {
			e.preventDefault();
			if (typed.length === 0) return;
			setTyped((prev) => prev.slice(0, -1));
			return;
		}
		if (e.ctrlKey || e.altKey || e.metaKey) return;
		if (e.key.length === 1) {
			e.preventDefault();
			if (!startedAt) setStartedAt(Date.now());
			setTyped((prev) => {
				const nextLen = prev.length + 1;
				const next = prev + e.key;
				if (nextLen >= target.length) {
					setFinished(true);
					const now = Date.now();
					const w = computeWpm(correctCount, startedAt ?? now);
					const a = computeAccuracy(nextLen ? correctCount : 0, nextLen);
					setFinalStats({ wpm: w, acc: a });
				}
				return next;
			});
			pulseMascot();
		}
	};

	const reset = () => {
		setTyped("");
		setStartedAt(null);
		setFinished(false);
		setFinalStats(null);
		setMascotFrame(0);
		containerRef.current?.focus();
	};

	const triggerReset = () => {
		if (resetting) return;
		setResetting(true);
	};

	useEffect(() => {
		return () => {
			if (frameTimeout.current) window.clearTimeout(frameTimeout.current);
		};
	}, []);

	const { moveCaretTo } = useFloatingCaret(reducedMotion);

	const renderChar = (ch: string, index: number) => {
		const typedChar = typed[index];
		const isActive = index === typed.length;
		const correct = typedChar !== undefined ? typedChar === ch : undefined;
		const inTrail = !isActive && index >= Math.max(0, typed.length - TRAIL_LEN) && index < typed.length;
		const base = [styles.char];
		if (correct === true) base.push(styles.correct);
		else if (correct === false) base.push(styles.incorrect, styles.pulse);
		if (isActive) base.push(styles.active);
		if (inTrail) base.push(styles.trail);
		if (ch === " ") base.push(styles.space);
		const className = base.join(" ");
		const content = ch === " " ? "\u00A0" : ch;
		return (
			<span
				key={`c-${index}-${ch}`}
				className={className}
				aria-hidden
				style={{ ['--i' as string]: String(index) } as React.CSSProperties}
				data-idx={index}
				ref={isActive ? (el) => {
					if (!el || !caretRef.current) return;
					const lineRect = lineRef.current?.getBoundingClientRect();
					if (!lineRect) return;
						let targetEl: HTMLElement = el;
						if (ch === " " && (el.offsetWidth < 1)) {
							const next = el.parentElement?.querySelector(`[data-idx='${index + 1}']`) as HTMLElement | null;
							if (next) targetEl = next;
						}
						const rect = targetEl.getBoundingClientRect();
						const x = rect.left - lineRect.left;
						const y = rect.top - lineRect.top + rect.height - 2;
						moveCaretTo({
							caret: caretRef.current,
							ghost: ghostRef.current,
							connector: ghostConnectorRef.current,
						}, x, y, rect.width);
				} : undefined}
			>
				{content}
			</span>
		);
	};

	useLayoutEffect(() => {
		const line = lineRef.current;
		if (!line) return;
		const activeIdx = typed.length;
		const targetEl = hideLeadingSpacesAndGetActive(line, activeIdx);
		if (targetEl && caretRef.current) {
			const lineRect = line.getBoundingClientRect();
			const rect = targetEl.getBoundingClientRect();
			moveCaretTo({
				caret: caretRef.current,
				ghost: ghostRef.current,
				connector: ghostConnectorRef.current,
			}, rect.left - lineRect.left, rect.top - lineRect.top + rect.height - 2, rect.width);
		}
	// moveCaretTo is stable from hook; suppress exhaustive-deps for it.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [target, typed, ready]);

	useEffect(() => {
		const line = lineRef.current;
		if (!line) return;
		const ro = new ResizeObserver(() => {
			const activeIdx = typed.length;
			const targetEl = hideLeadingSpacesAndGetActive(line, activeIdx);
			if (targetEl && caretRef.current) {
				const lineRect = line.getBoundingClientRect();
				const rect = targetEl.getBoundingClientRect();
				moveCaretTo({
					caret: caretRef.current,
					ghost: ghostRef.current,
					connector: ghostConnectorRef.current,
				}, rect.left - lineRect.left, rect.top - lineRect.top + rect.height - 2, rect.width);
			}
		});
		ro.observe(line);
		return () => ro.disconnect();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [typed.length, target, ready]);

	return (
		<div className="group relative w-full rounded-none border border-[color:var(--foreground)]/10 bg-transparent p-3">
			<div
				ref={containerRef}
				className={[styles.root, finished ? styles.finishedState : ""].join(" ")}
				tabIndex={0}
				role="textbox"
				aria-label="Typing simulator. Press Tab to restart."
				onKeyDown={handleKeyDown}
			>
				<Mascot frameSrc={MASCOT_FRAMES[mascotFrame]} />
				<HUD wpm={wpm} accuracy={accuracy} />
				<div className={styles.surface}>
					{!ready && (<StartOverlay onStart={handleStart} />)}
					{ready && (
						<div
							className={[
								styles.textLine,
								finished ? styles.finished : "",
								resetting ? styles.dissolve : "",
							].join(" ")}
							aria-live="polite"
							ref={lineRef}
							onAnimationEnd={(e) => {
								const name = (e.animationName || "");
								if (resetting && (name.includes("char-dissolve") || name.includes("line-fade"))) {
									setTarget(generatePassage());
									setResetting(false);
									reset();
								}
							}}
						>
							<span ref={ghostRef} className={caretStyles.caretGhost} aria-hidden />
							<span ref={ghostConnectorRef} className={caretStyles.caretGhostConnector} aria-hidden />
							<span ref={caretRef} className={caretStyles.floatingCaret} style={{ opacity: finished ? 0 : 1 }} aria-hidden />
							{(() => {
								const parts = target.split(/(\s)/);
								let index = 0;
								return parts.map((token, pIdx) => {
									if (token === " ") {
										const node = renderChar(" ", index);
										index += 1;
										return React.cloneElement(node as React.ReactElement, { key: `s-${index}` });
									}
									const chars = token.split("");
									const nodes = chars.map((ch) => {
										const node = renderChar(ch, index);
										index += 1;
										return node;
									});
									return <span key={`w-${pIdx}-${token}`} className={styles.word}>{nodes}</span>;
								});
							})()}
						</div>
					)}
				</div>
				{ready && (
					<div className={styles.footer}>
						<div className={styles.hint}>[tab] to restart</div>
					</div>
				)}
				{finished && (<ResultOverlay wpm={wpm} accuracy={accuracy} />)}
			</div>
		</div>
	);
}
