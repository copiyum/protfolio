"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { useTheme } from "next-themes";
import type { ProfileSettings } from "@/lib/profile-settings";
import useHasMounted from "@/hooks/use-has-mounted";
import styles from "./map-section.module.css";

const MapWidget = dynamic(() => import("@/components/map/map-widget"), { ssr: false });

export default function MapSection({ profile }: { profile: ProfileSettings }) {
  const [interactive, setInteractive] = useState(false);
  const { resolvedTheme } = useTheme();
  const mounted = useHasMounted();
  const dark = mounted && resolvedTheme === "dark";

  if (interactive) {
    return <MapWidget center={[profile.longitude, profile.latitude]} locationLabel={profile.locationLabel} />;
  }

  return (
    <div
      className={styles.poster}
      onPointerEnter={() => setInteractive(true)}
    >
      <Image
        src={dark ? "/assets/map/bengaluru-poster-dark.webp" : "/assets/map/bengaluru-poster.webp"}
        alt={`Static map centered on ${profile.locationLabel}`}
        fill
        priority
        sizes="(max-width: 640px) 100vw, 550px"
        className={styles.posterImage}
      />
      <button
        type="button"
        className={styles.loadButton}
        onClick={() => setInteractive(true)}
        aria-label={`Load interactive map centered on ${profile.locationLabel}`}
      >
        Explore map
      </button>
    </div>
  );
}
