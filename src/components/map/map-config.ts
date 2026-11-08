// Shared by the live MapLibre widget and scripts/capture-static-map.ts, so the
// static placeholder image is rendered with exactly the view the live map opens on.
export const DEFAULT_CENTER: [number, number] = [77.5946, 12.9716];
export const MAP_ZOOM = 12;
export const MAP_PITCH = 45;
export const MAP_BEARING = -15;

// Static placeholder: CSS px size (rendered at 2x). Larger than the widget box
// (max ~534x210) so it is drawn 1:1 and simply cropped around the center —
// same scale and framing as the live map at MAP_ZOOM.
export const STATIC_MAP_WIDTH = 600;
export const STATIC_MAP_HEIGHT = 240;
export const STATIC_MAP_SRC = {
  light: "/assets/map/static-light.webp",
  dark: "/assets/map/static-dark.webp",
} as const;

export function mapStyleUrl(isDark: boolean) {
  // OpenFreeMap: "dark" is the dark basemap (bg #0c0c0c); "bright" for light theme.
  return isDark
    ? "https://tiles.openfreemap.org/styles/dark"
    : "https://tiles.openfreemap.org/styles/bright";
}
