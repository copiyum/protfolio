"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import useTimezoneClock from "@/hooks/use-timezone-clock";
import useAlbumAccent from "@/hooks/use-album-accent";
import NowPlaying from "@/components/home/now-playing";
import type { NowPlayingData } from "@/app/api/now-playing/route";
import type { ProfileSettings } from "@/lib/profile-settings";

const POLL_INTERVAL = 30_000;
type BentoCell = { kind: string; label: string; value?: string; sub?: string };

const GlowCardGrid = memo(function GlowCardGrid({ children }: { children: React.ReactNode }) {
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
					"--card-icon-brightness": "1.18",
					"--card-icon-scale": "4",
					"--card-icon-opacity": "0.34",
					"--card-border-width": "3px",
					"--card-border-blur": "10px",
					"--card-border-saturate": "1.15",
					"--card-border-brightness": "1.85",
					"--card-border-contrast": "1.25",
				} as React.CSSProperties
			}
		>
			{children}
		</div>
	);
});

const GlowCard = memo(function GlowCard({
	children,
	glowColor,
	className = "",
}: {
	children: React.ReactNode;
	glowColor?: string | null;
	className?: string;
}) {
	return (
		<div
			data-slot="glow-card"
			className={`group/glow-card isolate @container-size relative overflow-hidden rounded-(--card-radius) bg-(--page-bg) ring-1 ring-[color:var(--card-border)] ${className}`}
			style={
				{
					"--card-glow-color": glowColor ?? "transparent",
				} as React.CSSProperties
			}
		>
			<div className="flex size-full overflow-hidden rounded-(--card-radius) [clip-path:inset(0_round_var(--card-radius))]">
				{glowColor && (
					<div
						className={[
							"pointer-events-none absolute inset-0 flex items-center justify-center",
							"translate-x-[calc(var(--pointer-x,-10)*35cqi)] translate-y-[calc(var(--pointer-y,-10)*35cqh)] translate-z-0 scale-(--card-icon-scale)",
							"blur-(--card-icon-blur) brightness-(--card-icon-brightness)",
							"opacity-0 group-hover/glow-card:opacity-(--card-icon-opacity) transition-[opacity] duration-(--motion-micro) will-change-[transform,filter,opacity]",
						].join(" ")}
					>
						<div className="size-20 rounded-[28px] bg-[color:var(--card-glow-color)]" />
					</div>
				)}

				<div className="z-[1] flex flex-1 flex-col p-3">{children}</div>
			</div>

			{glowColor && (
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
});

const CellLabel = memo(function CellLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="mb-1 text-[10px] uppercase tracking-[0.1em] text-[color:var(--foreground)]/30">
			{children}
		</p>
	);
});

const CellValue = memo(function CellValue({
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
});

const CellSub = memo(function CellSub({
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
});

const LocationCell = memo(function LocationCell({ locationLabel }: { locationLabel: string }) {
	return (
		<GlowCard>
			<CellLabel>Based in</CellLabel>
			<CellValue>{locationLabel}</CellValue>
		</GlowCard>
	);
});

const ClockCell = memo(function ClockCell({
	timezone,
	timezoneLabel,
}: {
	timezone: string;
	timezoneLabel: string;
}) {
	const { time, offsetLabel } = useTimezoneClock(timezone);

	return (
		<GlowCard className="group">
			<CellLabel>Local time</CellLabel>
			<CellValue className="tabular-nums" suppressHydrationWarning>
				{time}
			</CellValue>
			<CellSub suppressHydrationWarning>
				<span className="group-hover:hidden">{timezoneLabel}</span>
				<span className="hidden group-hover:inline">{offsetLabel}</span>
			</CellSub>
		</GlowCard>
	);
});

const CustomCell = memo(function CustomCell({ cell }: { cell: BentoCell }) {
	return (
		<GlowCard>
			<CellLabel>{cell.label}</CellLabel>
			<CellValue>{cell.value}</CellValue>
			<CellSub>{cell.sub}</CellSub>
		</GlowCard>
	);
});

const NowPlayingCell = memo(function NowPlayingCell({
	albumAccent,
	np,
}: {
	albumAccent: string | null;
	np: NowPlayingData | null;
}) {
	const playingAccent = np?.playing ? (albumAccent ?? np.accentColor ?? null) : null;

	return (
		<GlowCard glowColor={playingAccent} className="col-span-3">
			<CellLabel>Now Playing</CellLabel>
			<NowPlaying
				loading={np === null}
				playing={np?.playing ?? false}
				title={np?.title ?? ""}
				artist={np?.artist ?? ""}
				artUrl={np?.artUrl ?? null}
				accentColor={playingAccent}
			/>
		</GlowCard>
	);
});

// ── BentoBlock ────────────────────────────────────────────────────────────────
export default function BentoBlock({ cells, profile }: { cells: BentoCell[]; profile: ProfileSettings }) {
	const [np, setNp] = useState<NowPlayingData | null>(null);
	const customCell = useMemo(() => cells.find((cell) => cell.kind === "custom") ?? {
		kind: "custom",
		label: "Currently",
		value: "Building in public",
		sub: "shipping something new",
	}, [cells]);

	useEffect(() => {
		const fetchNp = async () => {
			try {
				const res = await fetch("/api/now-playing");
				const data = (await res.json()) as NowPlayingData;
				setNp(data);
			} catch {
				// Keep the existing cell content if the public music endpoint flakes.
			}
		};
		fetchNp();
		const id = setInterval(fetchNp, POLL_INTERVAL);
		return () => clearInterval(id);
	}, []);

	const nowPlayingArt = np?.playing && np.artUrl ? np.artUrl : null;
	const albumAccent = useAlbumAccent(nowPlayingArt);

	return (
		<GlowCardGrid>
			<LocationCell locationLabel={profile.locationLabel} />
			<ClockCell timezone={profile.timezone} timezoneLabel={profile.timezoneLabel} />
			<CustomCell cell={customCell} />
			<NowPlayingCell albumAccent={albumAccent} np={np} />
		</GlowCardGrid>
	);
}
