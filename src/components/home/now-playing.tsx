"use client";
import Image from "next/image";

interface Props {
  playing: boolean;
  title: string;
  artist: string;
  artUrl: string | null;
  accentColor?: string | null;
}

const FALLBACK_BAR_COLOR = "#1db954";

export default function NowPlaying({ playing, title, artist, artUrl, accentColor }: Props) {
  const barColor = accentColor || FALLBACK_BAR_COLOR;

  if (!playing) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[color:var(--foreground)]/5 text-base text-[color:var(--foreground)]/20">
          ♪
        </div>
        <span className="text-[12px] text-[color:var(--foreground)]/30">
          Not listening right now
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Album art */}
      <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-[color:var(--foreground)]/10">
        {artUrl ? (
          <Image src={artUrl} alt={title} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex size-full items-center justify-center text-base">♪</div>
        )}
      </div>

      {/* Track info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold leading-none">{title}</div>
        <div className="mt-1 truncate text-[11px] text-[color:var(--foreground)]/45">{artist}</div>
      </div>

      {/* Equalizer */}
      <div className="flex h-4 shrink-0 items-end gap-[2px]" aria-hidden>
        {([0, 120, 50, 180] as const).map((delay) => (
          <span
            key={delay}
            className="h-4 w-[3px] origin-bottom rounded-sm"
            style={{
              background: barColor,
              boxShadow: `0 0 8px color-mix(in srgb, ${barColor}, transparent 35%)`,
              animation: `eq-bar 0.7s var(--ease-standard) ${delay}ms infinite alternate`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
