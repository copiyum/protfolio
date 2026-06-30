"use client";
import { useEffect, useRef, useState } from "react";
import useISTClock from "@/hooks/use-ist-clock";
import { bentoCustomCell } from "@/data/bento";
import NowPlaying from "@/components/home/now-playing";
import type { NowPlayingData } from "@/app/api/now-playing/route";

const POLL_INTERVAL = 30_000;

function GlowCardGrid({ children }: { children: React.ReactNode }) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const onPointerMove = (e: PointerEvent) => {
			if (!ref.current) return;
			ref.current
				.querySelectorAll<HTMLElement>("[data-slot='glow-card']")
				.forEach((card) => {
					const r = card.getBoundingClientRect();
					card.style.setProperty(
						"--pointer-x",
						((e.clientX - (r.left + r.width / 2)) / (r.width / 2)).toFixed(3),
					);
					card.style.setProperty(
						"--pointer-y",
						((e.clientY - (r.top + r.height / 2)) / (r.height / 2)).toFixed(3),
					);
				});
		};
		document.addEventListener("pointermove", onPointerMove);
		return () => document.removeEventListener("pointermove", onPointerMove);
	}, []);

	return (
		<div
			ref={ref}
			className="grid grid-cols-3 gap-2"
			style={
				{
					"--card-radius": "16px",
					"--card-icon-blur": "25px",
					"--card-icon-saturate": "5",
					"--card-icon-brightness": "1.3",
					"--card-icon-scale": "4",
					"--card-icon-opacity": "0.3",
					"--card-border-width": "3px",
					"--card-border-blur": "10px",
					"--card-border-saturate": "4.2",
					"--card-border-brightness": "2.5",
					"--card-border-contrast": "2.5",
				} as React.CSSProperties
			}
		>
			{children}
		</div>
	);
}

function GlowCard({
	children,
	glowSrc,
	className = "",
}: {
	children: React.ReactNode;
	glowSrc?: string | null;
	className?: string;
}) {
	return (
		<div
			data-slot="glow-card"
			className={`group/glow-card isolate @container-size relative overflow-hidden rounded-(--card-radius) bg-(--page-bg) ring-1 ring-[color:var(--card-border)] ${className}`}
		>
			<div className="flex size-full overflow-hidden rounded-(--card-radius) [clip-path:inset(0_round_var(--card-radius))]">
				{/* Glow source — blurred album art, pointer-tracked; opacity-gated by hover so the bleed only shows when the cursor is on the card */}
				{glowSrc && (
					<div
						className={[
							"pointer-events-none absolute inset-0 flex items-center justify-center",
							"translate-x-[calc(var(--pointer-x,-10)*35cqi)] translate-y-[calc(var(--pointer-y,-10)*35cqh)] translate-z-0 scale-(--card-icon-scale)",
							"blur-(--card-icon-blur) brightness-(--card-icon-brightness) saturate-(--card-icon-saturate)",
							"opacity-0 group-hover/glow-card:opacity-(--card-icon-opacity) transition-[opacity] duration-(--motion-micro) will-change-[transform,filter,opacity]",
						].join(" ")}
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={glowSrc} alt="" className="size-20 object-cover" />
					</div>
				)}

				<div className="z-[1] flex flex-1 flex-col p-3">{children}</div>
			</div>

			{/* Saturated border-bleed — backdrop-filter amplifies the glow into the edge; opacity-gated to match the glow source */}
			{glowSrc && (
				<div
					className={[
						"pointer-events-none absolute inset-0 translate-z-0 rounded-(--card-radius)",
						"border-[length:var(--card-border-width)] border-solid border-transparent",
						"[clip-path:inset(0_round_var(--card-radius))]",
						"backdrop-blur-(--card-border-blur) backdrop-brightness-(--card-border-brightness)",
						"backdrop-contrast-(--card-border-contrast) backdrop-saturate-(--card-border-saturate)",
						"opacity-0 group-hover/glow-card:opacity-100 transition-[opacity] duration-(--motion-micro)",
					].join(" ")}
					style={
						{
							maskImage:
								"linear-gradient(#fff 0 100%), linear-gradient(#fff 0 100%)",
							maskOrigin: "border-box, padding-box",
							maskClip: "border-box, padding-box",
							maskComposite: "exclude",
							WebkitMaskComposite: "xor",
						} as React.CSSProperties
					}
				/>
			)}
		</div>
	);
}

function CellLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="mb-1 text-[10px] uppercase tracking-[0.1em] text-[color:var(--foreground)]/30">
			{children}
		</p>
	);
}

function CellValue({
	children,
	className = "",
	suppressHydrationWarning,
}: {
	children: React.ReactNode;
	className?: string;
	suppressHydrationWarning?: boolean;
}) {
	return (
		<p
			className={`text-[15px] font-bold leading-none ${className}`}
			suppressHydrationWarning={suppressHydrationWarning}
		>
			{children}
		</p>
	);
}

function CellSub({
	children,
	suppressHydrationWarning,
}: {
	children: React.ReactNode;
	suppressHydrationWarning?: boolean;
}) {
	return (
		<p
			className="mt-1 text-[11px] text-[color:var(--foreground)]/40"
			suppressHydrationWarning={suppressHydrationWarning}
		>
			{children}
		</p>
	);
}

// ── BentoBlock ────────────────────────────────────────────────────────────────
export default function BentoBlock() {
	const { time, userOffset } = useISTClock();
	const [np, setNp] = useState<NowPlayingData | null>(null);

	useEffect(() => {
		const fetchNp = () =>
			fetch("/api/now-playing")
				.then((r) => r.json())
				.then(setNp)
				.catch(() => {});
		fetchNp();
		const id = setInterval(fetchNp, POLL_INTERVAL);
		return () => clearInterval(id);
	}, []);

	const offsetLabel =
		userOffset === 0
			? "same timezone"
			: `${Math.abs(userOffset)}h ${userOffset > 0 ? "ahead of" : "behind"} you`;
	const nowPlayingGlow = np?.playing && np.artUrl ? np.artUrl : null;

	return (
		<GlowCardGrid>
			{/* Based in */}
			<GlowCard>
				<CellLabel>Based in</CellLabel>
				<CellValue>Bangalore</CellValue>
			</GlowCard>

			{/* Local time — hover swaps subtitle from "IST" to offset label */}
			<GlowCard className="group">
				<CellLabel>Local time</CellLabel>
				<CellValue className="tabular-nums" suppressHydrationWarning>
					{time}
				</CellValue>
				<CellSub suppressHydrationWarning>
					<span className="group-hover:hidden">IST</span>
					<span className="hidden group-hover:inline">{offsetLabel}</span>
				</CellSub>
			</GlowCard>

			{/* Custom cell — edit src/data/bento.ts */}
			<GlowCard>
				<CellLabel>{bentoCustomCell.label}</CellLabel>
				<CellValue>{bentoCustomCell.value}</CellValue>
				<CellSub>{bentoCustomCell.sub}</CellSub>
			</GlowCard>

			{/* Now Playing — full width, album art IS the glow source */}
			<GlowCard glowSrc={nowPlayingGlow} className="col-span-3">
				<CellLabel>Now Playing</CellLabel>
				<NowPlaying
					playing={np?.playing ?? false}
					title={np?.title ?? ""}
					artist={np?.artist ?? ""}
					artUrl={np?.artUrl ?? null}
					accentColor={np?.accentColor ?? null}
				/>
			</GlowCard>
		</GlowCardGrid>
	);
}
