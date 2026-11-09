// maplibre-gl v6 is ESM-only and loads its web worker from a URL next to its own
// script. Next bundles maplibre into a hashed chunk and does not emit that worker
// file, so we serve it ourselves from /vendor and point setWorkerUrl() at it
// (see src/components/map/map-widget.tsx). Runs before `dev` and `build:next`.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const src = path.join(path.dirname(require.resolve("maplibre-gl/package.json")), "dist/maplibre-gl-worker.mjs");
const outDir = path.join(root, "public/vendor");
await mkdir(outDir, { recursive: true });
await copyFile(src, path.join(outDir, "maplibre-gl-worker.mjs"));
