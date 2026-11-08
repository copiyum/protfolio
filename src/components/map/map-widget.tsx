"use client";
import { useEffect, useMemo, useRef } from "react";
import maplibregl, { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import styles from "./map-widget.module.css";
import {
  DEFAULT_CENTER,
  MAP_BEARING,
  MAP_PITCH,
  MAP_ZOOM,
  mapStyleUrl as styleUrl,
} from "./map-config";

const BUILDING_ZOOM_MIN = 15;
const BUILDING_HEIGHT_FACTOR = 0.5;

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

// Live MapLibre layer. Loaded on demand by components/home/map-section.tsx,
// which owns the container, the static placeholder and the plane/cloud overlay.
// Opens on exactly the static image's view (no zoom-9 → 12 fly-in, which used to
// fetch two zoom levels of tiles), so the swap is seamless.
export default function MapWidget({
  center = DEFAULT_CENTER,
  locationLabel = "Location",
  onReady,
}: {
  center?: [number, number];
  locationLabel?: string;
  onReady?: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  // The dark-ness currently applied to the map's style; lets us skip redundant
  // setStyle calls (e.g. next-themes settling undefined → "system", both light).
  const appliedDark = useRef<boolean | null>(null);
  const onReadyRef = useRef(onReady);
  const { resolvedTheme } = useTheme();
  const centerLng = center[0];
  const centerLat = center[1];
  const mapCenter = useMemo<[number, number]>(() => {
    const lng = Number.isFinite(centerLng) ? centerLng : DEFAULT_CENTER[0];
    const lat = Number.isFinite(centerLat) ? centerLat : DEFAULT_CENTER[1];
    return [lng, lat];
  }, [centerLng, centerLat]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

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
      center: mapCenter,
      zoom: MAP_ZOOM,
      pitch: MAP_PITCH,
      bearing: MAP_BEARING,
      interactive: true,
      attributionControl: false,
      // Globe projection (applied on load) gives a real earth view when zoomed
      // out — which also removes the old "repeated flat world copies" problem, so
      // we no longer clamp minZoom or disable world copies.
      fadeDuration: 0, // tiles snap in rather than visibly fading on zoom
      // 3x phone screens would otherwise render 2.25x the pixels of 2x for no
      // visible gain on a 200px-tall card.
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      // On touch, one finger keeps scrolling the page; two fingers move the map.
      cooperativeGestures: window.matchMedia("(pointer: coarse)").matches,
    });
    mapRef.current = map;

    // Some OpenFreeMap styles reference sprite images they don't ship (e.g.
    // "wood-pattern" in dark). Register a transparent pixel instead of warning.
    map.on("styleimagemissing", (e) => {
      if (!map.hasImage(e.id)) map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
    });

    map.on("load", () => {
      map.setProjection({ type: "globe" });
      addBuildings(map, isDark);
      // Only cross-fade away from the static image once the live map has
      // actually painted at a real size; otherwise keep the static view.
      map.resize();
      map.once("idle", () => {
        if (map.getCanvas().clientHeight > 0) onReadyRef.current?.();
      });
    });
    // The user asked for the map (click/tap/Enter): hand it keyboard focus.
    ref.current.focus({ preventScroll: true });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // create-once; theme is synced separately via setStyle
  }, [mapCenter]);

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
      ref={ref}
      className={styles.map}
      role="region"
      tabIndex={0}
      aria-label={`Interactive map centered on ${locationLabel}`}
    />
  );
}
