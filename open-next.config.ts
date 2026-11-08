import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import type { OpenNextConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

// ISR / data cache for the public site (bindings live in wrangler.toml):
// - incrementalCache: rendered pages + unstable_cache data in R2
//   (NEXT_INC_CACHE_R2_BUCKET), fronted by the per-colo Cache API.
// - queue: background ISR regeneration via a Durable Object
//   (NEXT_CACHE_DO_QUEUE; re-enters the worker through WORKER_SELF_REFERENCE).
// - tagCache: makes revalidateTag/updateTag/revalidatePath from admin actions
//   invalidate cached pages (NEXT_TAG_CACHE_DO_SHARDED).
// Without these, the default "dummy" caches persist nothing: every request
// re-rendered and re-read D1 regardless of `revalidate`.
export default {
  ...defineCloudflareConfig({
    incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "short-lived" }),
    queue: doQueue,
    tagCache: doShardedTagCache({ baseShardSize: 12 }),
  }),
  // Break the build loop: opennextjs-cloudflare internally shells out to
  // `${packager} run build` to run `next build`. Our package.json `build` IS
  // opennextjs-cloudflare — that recurses forever → OOM + disk fill. Point
  // the inner call at the raw `next build` script.
  buildCommand: "npm run build:next",
} satisfies OpenNextConfig;
