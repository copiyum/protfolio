/**
 * Renders the homepage map's static placeholders (light + dark) with MapLibre in
 * headless Chromium and writes them to public/assets/map/static-{light,dark}.webp.
 *
 * Re-run when the profile location (latitude/longitude) changes:
 *   npx tsx scripts/capture-static-map.ts [lng] [lat]
 * Defaults to the map's DEFAULT_CENTER.
 */
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
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
const AVIF_QUALITY = 42;

async function main() {
  const lng = Number(process.argv[2] ?? DEFAULT_CENTER[0]);
  const lat = Number(process.argv[3] ?? DEFAULT_CENTER[1]);
  // maplibre v6 is ESM-only; its main module loads maplibre-gl-worker.mjs from
  // next to itself, so serve both from the fake origin.
  const dist = path.join(ROOT, "node_modules/maplibre-gl/dist");
  const maplibreFiles: Record<string, string> = {
    "/maplibre-gl.mjs": await readFile(path.join(dist, "maplibre-gl.mjs"), "utf8"),
    "/maplibre-gl-worker.mjs": await readFile(path.join(dist, "maplibre-gl-worker.mjs"), "utf8"),
  };

  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({
    viewport: { width: STATIC_MAP_WIDTH, height: STATIC_MAP_HEIGHT },
    deviceScaleFactor: 2,
  });
  await page.route("https://capture.local/**", async (route) => {
    const url = new URL(route.request().url());
    const file = maplibreFiles[url.pathname];
    if (file) return route.fulfill({ body: file, contentType: "text/javascript" });
    return route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body style="margin:0">
        <div id="map" style="width:${STATIC_MAP_WIDTH}px;height:${STATIC_MAP_HEIGHT}px"></div>
        <script type="module">import * as m from "/maplibre-gl.mjs"; window.maplibregl = m;</script>
        </body></html>`,
    });
  });
  await page.goto("https://capture.local/");
  await page.waitForFunction(() => "maplibregl" in window);
  await mkdir(OUT_DIR, { recursive: true });

  for (const theme of ["light", "dark"] as const) {
    const [webpUrl, pngUrl] = await page.evaluate(
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
        const canvas = map.getCanvas();
        return [canvas.toDataURL("image/webp", quality), canvas.toDataURL("image/png")];
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
    const bytes = Buffer.from(webpUrl.split(",")[1], "base64");
    const out = path.join(OUT_DIR, `static-${theme}.webp`);
    await writeFile(out, bytes);
    console.log(`wrote ${path.relative(ROOT, out)} (${(bytes.length / 1024).toFixed(1)} KB)`);

    // AVIF from a lossless PNG master (not re-encoding the lossy WebP).
    // Needs `avifenc` (brew install libavif); skipped with a warning otherwise.
    const png = path.join(os.tmpdir(), `static-${theme}-${process.pid}.png`);
    const avif = path.join(OUT_DIR, `static-${theme}.avif`);
    await writeFile(png, Buffer.from(pngUrl.split(",")[1], "base64"));
    try {
      execFileSync("avifenc", ["-q", String(AVIF_QUALITY), "-s", "4", "-y", "420", "-j", "all", png, avif], { stdio: "ignore" });
      const size = (await readFile(avif)).length;
      console.log(`wrote ${path.relative(ROOT, avif)} (${(size / 1024).toFixed(1)} KB)`);
    } catch {
      console.warn("avifenc not found or failed; kept the WebP only");
    } finally {
      await rm(png, { force: true });
    }
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
