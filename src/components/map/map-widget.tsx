"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import styles from "./map-widget.module.css";
import Image from "next/image";
import useISTClock from "@/hooks/use-ist-clock";

// Map placement/tuning — single-use, so it lives with its only consumer.
const KOCHI: [number, number] = [76.2673, 9.9312];
const ZOOM_INITIAL = 9;
const ZOOM_FLY = 12;
const PITCH = 45;
const BEARING = -15;
const FLY_SPEED = 0.6;
const BUILDING_ZOOM_MIN = 15;
const BUILDING_HEIGHT_FACTOR = 0.5;

function styleUrl(isDark: boolean) {
  // positron = high-contrast light-on-dark; bright = light theme
  return isDark
    ? "https://tiles.openfreemap.org/styles/positron"
    : "https://tiles.openfreemap.org/styles/bright";
}

// (Re)attach the 3D buildings source + layer for the current style/theme.
// Called on first load and after every setStyle (which drops custom layers).
function addBuildings(map: Map, isDark: boolean) {
  try {
    if (!map.getSource("openfreemap")) {
      map.addSource("openfreemap", { url: "https://tiles.openfreemap.org/planet", type: "vector" });
    }
    const layers = map.getStyle().layers || [];
    let labelLayerId: string | undefined;
    for (let i = 0; i < layers.length; i++) {
      // @ts-expect-error maplibre style type doesn't include layout index signature
      if (layers[i].type === "symbol" && layers[i].layout?.["text-field"]) {
        labelLayerId = layers[i].id as string;
        break;
      }
    }
    if (map.getLayer("3d-buildings")) map.removeLayer("3d-buildings");
    map.addLayer(
      {
        id: "3d-buildings",
        source: "openfreemap",
        "source-layer": "building",
        type: "fill-extrusion",
        minzoom: BUILDING_ZOOM_MIN,
        filter: ["!=", ["get", "hide_3d"], true],
        paint: {
          "fill-extrusion-color": isDark
            ? [
                "interpolate", ["linear"], ["get", "render_height"],
                0, "#7a7a8a", 30, "#8a8a9a", 60, "#9a9aaa", 100, "#aaaacc", 150, "#bbbcdd", 200, "#ccccee",
              ]
            : [
                "interpolate", ["linear"], ["get", "render_height"],
                0, "#e0e0e0", 50, "#d0d0d0", 100, "#c0c0c0", 200, "#b0b0b0",
              ],
          "fill-extrusion-height": [
            "interpolate", ["linear"], ["zoom"],
            15, 0,
            16, ["*", ["get", "render_height"], BUILDING_HEIGHT_FACTOR],
          ],
          "fill-extrusion-base": ["case", [">=", ["get", "zoom"], 16], ["get", "render_min_height"], 0],
          "fill-extrusion-vertical-gradient": true,
          "fill-extrusion-opacity": isDark ? 0.95 : 1.0,
        },
      },
      labelLayerId
    );
  } catch {
    // ignore layer add failures
  }
}

export default function MapWidget() {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  // The dark-ness currently applied to the map's style; lets us skip redundant
  // setStyle calls (e.g. next-themes settling undefined → "system", both light).
  const appliedDark = useRef<boolean | null>(null);
  const { time, userOffset } = useISTClock();
  const { resolvedTheme } = useTheme();
  const [hovering, setHovering] = useState(false);

  // Create the map exactly once. Theme changes are handled by setStyle below,
  // not by tearing the whole map down and refetching every tile.
  useEffect(() => {
    if (!ref.current) return;
    // next-themes sets the `dark` class on <html> pre-paint, so the DOM already
    // knows the real theme here — create with the right style, no load-time swap.
    const isDark = document.documentElement.classList.contains("dark");
    appliedDark.current = isDark;

    const map = new maplibregl.Map({
      container: ref.current,
      style: styleUrl(isDark),
      center: KOCHI,
      zoom: ZOOM_INITIAL,
      pitch: PITCH,
      bearing: BEARING,
      interactive: true,
      attributionControl: false,
      // Globe projection (applied on load) gives a real earth view when zoomed
      // out — which also removes the old "repeated flat world copies" problem, so
      // we no longer clamp minZoom or disable world copies.
      fadeDuration: 0, // tiles snap in rather than visibly fading on zoom
    });
    mapRef.current = map;

    map.on("load", () => {
      map.setProjection({ type: "globe" });
      map.flyTo({ center: KOCHI, zoom: ZOOM_FLY, essential: true, speed: FLY_SPEED });
      addBuildings(map, isDark);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // create-once; theme is synced separately via setStyle
  }, []);

  // Swap basemap + rebuild buildings ONLY when light/dark actually flips — no
  // teardown, no re-fly, and no redundant reload when the theme settles to the
  // same effective appearance.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const isDark = resolvedTheme === "dark";
    if (appliedDark.current === isDark) return;
    appliedDark.current = isDark;
    map.setStyle(styleUrl(isDark));
    map.once("styledata", () => {
      map.setProjection({ type: "globe" });
      addBuildings(map, isDark);
    });
  }, [resolvedTheme]);

  return (
    <div
      className={`${styles.container} ${hovering ? 'hovering' : ''}`}
      data-theme={resolvedTheme}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className={`${styles.clock} group relative`}
      >
        <div className="relative" suppressHydrationWarning>
          {time} IST
          <div
            className="absolute left-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none"
            style={{ background: 'var(--tooltip-bg, rgba(0,0,0,0.8))', color: 'var(--tooltip-fg, #fff)' }}
          >
            {userOffset === 0 ? "Same as your timezone" : `${Math.abs(userOffset)}h ${userOffset > 0 ? "ahead of" : "behind"} you`}
          </div>
        </div>
      </div>
      <div ref={ref} className={styles.map} />
      <div className={styles.overlay}>
        <div className={styles.planeTrack}>
          <div className={styles.planeWrap}>
            <Image src="/assets/plane/plane-shadow.webp" alt="plane shadow" width={72} height={40} className={styles.shadow} />
            <Image src="/assets/plane/plane.webp" alt="plane" width={72} height={40} className={styles.plane} />
          </div>
        </div>
        {/* Back layer — larger, slower, fainter: parallax depth */}
        <Image
          src="/assets/plane/cloud.webp"
          alt=""
          aria-hidden
          width={300}
          height={200}
          className={`${styles.cloud} ${styles.cloudBack} ${resolvedTheme === 'dark' ? styles.cloudDark : ''}`}
        />
        <Image
          src="/assets/plane/cloud.webp"
          alt="cloud"
          width={240}
          height={160}
          className={`${styles.cloud} ${resolvedTheme === 'dark' ? styles.cloudDark : ''}`}
        />
      </div>
    </div>
  );
}
