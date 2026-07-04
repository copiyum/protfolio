import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import type { OpenNextConfig } from "@opennextjs/cloudflare";

// Break the build loop: opennextjs-cloudflare internally shells out to
// `${packager} run build` to run `next build`. Our package.json `build` IS
// opennextjs-cloudflare — that recurses forever → OOM + disk fill. Point
// the inner call at the raw `next build` script.
export default {
  ...defineCloudflareConfig({}),
  buildCommand: "npm run build:next",
} satisfies OpenNextConfig;