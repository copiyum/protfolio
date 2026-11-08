/**
 * Renders the homepage map's static placeholders (light + dark) with MapLibre in
 * headless Chromium and writes them to public/assets/map/static-{light,dark}.webp.
 *
 * Re-run when the profile location (latitude/longitude) changes:
 *   npx tsx scripts/capture-static-map.ts [lng] [lat]
 * Defaults to the map's DEFAULT_CENTER.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import {
  DEFAULT_CENTER,
  MAP_BEARING,
  MAP_PITCH,
  MAP_ZOOM,
  STATIC_MAP_HEIGHT,
  STATIC_MAP_WIDTH,
  mapStyleUrl,
} from "../src/components/map/map-config";

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public/assets/map");
const WEBP_QUALITY = 0.78;

async function main() {
  const lng = Number(process.argv[2] ?? DEFAULT_CENTER[0]);
  const lat = Number(process.argv[3] ?? DEFAULT_CENTER[1]);
  const maplibreJs = await readFile(path.join(ROOT, "node_modules/maplibre-gl/dist/maplibre-gl.js"), "utf8");

  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({
    viewport: { width: STATIC_MAP_WIDTH, height: STATIC_MAP_HEIGHT },
    deviceScaleFactor: 2,
  });
  await page.route("https://capture.local/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/maplibre-gl.js") {
      return route.fulfill({ body: maplibreJs, contentType: "text/javascript" });
    }
    return route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body style="margin:0">
        <div id="map" style="width:${STATIC_MAP_WIDTH}px;height:${STATIC_MAP_HEIGHT}px"></div>
        <script src="/maplibre-gl.js"></script></body></html>`,
    });
  });
  await page.goto("https://capture.local/");
  await mkdir(OUT_DIR, { recursive: true });

  for (const theme of ["light", "dark"] as const) {
    const dataUrl = await page.evaluate(
      async ({ style, center, zoom, pitch, bearing, quality }) => {
        const w = window as unknown as {
          maplibregl: { Map: new (opts: object) => {
            on(ev: string, cb: () => void): void;
            once(ev: string, cb: () => void): void;
            setProjection(p: object): void;
            getCanvas(): HTMLCanvasElement;
            remove(): void;
          } };
          __map?: { remove(): void };
        };
        w.__map?.remove();
        const map = new w.maplibregl.Map({
          container: "map",
          style,
          center,
          zoom,
          pitch,
          bearing,
          attributionControl: false,
          interactive: false,
          fadeDuration: 0,
          canvasContextAttributes: { preserveDrawingBuffer: true },
        });
        w.__map = map;
        await new Promise<void>((resolve) => map.on("load", () => resolve()));
        map.setProjection({ type: "globe" });
        await new Promise<void>((resolve) => map.once("idle", () => resolve()));
        return map.getCanvas().toDataURL("image/webp", quality);
      },
      {
        style: mapStyleUrl(theme === "dark"),
        center: [lng, lat] as [number, number],
        zoom: MAP_ZOOM,
        pitch: MAP_PITCH,
        bearing: MAP_BEARING,
        quality: WEBP_QUALITY,
      },
    );
    const bytes = Buffer.from(dataUrl.split(",")[1], "base64");
    const out = path.join(OUT_DIR, `static-${theme}.webp`);
    await writeFile(out, bytes);
    console.log(`wrote ${path.relative(ROOT, out)} (${(bytes.length / 1024).toFixed(1)} KB)`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
