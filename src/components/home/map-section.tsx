"use client";
import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import type { ProfileSettings } from "@/lib/profile-settings";
import { DEFAULT_CENTER } from "@/components/map/map-config";
import styles from "@/components/map/map-widget.module.css";

// maplibre-gl (~250KB gz JS, ~1.5MB tiles, WebGL) only loads on intent: the
// first paint is a static image of the exact same view. Hover/focus prefetches
// the chunk; click/tap/Enter mounts the live map on top of the image.
const loadMapWidget = () => import("@/components/map/map-widget");
type MapWidgetComponent = Awaited<ReturnType<typeof loadMapWidget>>["default"];

export default function MapSection({ profile }: { profile: ProfileSettings }) {
  const [Widget, setWidget] = useState<MapWidgetComponent | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const activating = useRef(false);
  const lng = Number.isFinite(profile.longitude) ? profile.longitude : DEFAULT_CENTER[0];
  const lat = Number.isFinite(profile.latitude) ? profile.latitude : DEFAULT_CENTER[1];

  const prefetch = useCallback(() => {
    void loadMapWidget().catch(() => {});
    // Warm the TLS connection to the tile server so the first tiles after a
    // click don't pay for DNS + handshake.
    if (!document.querySelector('link[data-map-preconnect]')) {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = "https://tiles.openfreemap.org";
      link.crossOrigin = "anonymous";
      link.dataset.mapPreconnect = "";
      document.head.appendChild(link);
    }
  }, []);

  const activate = useCallback(() => {
    if (activating.current) return;
    activating.current = true;
    loadMapWidget()
      .then((mod) => setWidget(() => mod.default))
      .catch(() => {
        activating.current = false;
      });
  }, []);

  // Keep the static view until the live map has painted, then cross-fade.
  const onMapReady = useCallback(() => setMapReady(true), []);

  return (
    <div
      className={styles.container}
      data-live={Widget ? "true" : undefined}
      data-ready={mapReady ? "true" : undefined}
      onPointerEnter={prefetch}
    >
      <div className={styles.staticMap} aria-hidden />
      {Widget ? (
        <Widget center={[lng, lat]} locationLabel={profile.locationLabel} onReady={onMapReady} />
      ) : (
        <button
          type="button"
          className={styles.activate}
          onClick={activate}
          onFocus={prefetch}
          aria-label={`Load interactive map of ${profile.locationLabel}`}
        >
          <span className={styles.activateHint}>Explore map</span>
        </button>
      )}
      <div className={styles.overlay}>
        <div className={styles.planeTrack}>
          <div className={styles.planeWrap}>
            <Image src="/assets/plane/plane-shadow.webp" alt="" aria-hidden width={72} height={40} className={styles.shadow} />
            <Image src="/assets/plane/plane.webp" alt="" aria-hidden width={72} height={40} className={styles.plane} />
          </div>
        </div>
        {/* Back layer — larger, slower, fainter: parallax depth */}
        <Image
          src="/assets/plane/cloud.webp"
          alt=""
          aria-hidden
          width={300}
          height={200}
          className={`${styles.cloud} ${styles.cloudBack}`}
        />
        <Image src="/assets/plane/cloud.webp" alt="" aria-hidden width={240} height={160} className={styles.cloud} />
      </div>
    </div>
  );
}
