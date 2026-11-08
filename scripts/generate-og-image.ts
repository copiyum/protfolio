/**
 * Renders the site-wide Open Graph / Twitter card image to public/og.png
 * (1200x630) with headless Chromium. A static file instead of
 * `opengraph-image.tsx` keeps @vercel/og's WASM out of the Worker bundle.
 *
 *   npx tsx scripts/generate-og-image.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(__dirname, "..");

async function main() {
  const icon = (await readFile(path.join(ROOT, "src/app/icon.svg"), "utf8")).replace(/fill="#0a0a0a"/g, 'fill="#8f91e0"');
  const html = `<!doctype html><html><head><style>
    * { box-sizing: border-box; margin: 0; }
    body {
      width: 1200px; height: 630px; overflow: hidden;
      font-family: -apple-system, "SF Pro Display", "Inter", "Segoe UI", system-ui, sans-serif;
      background: radial-gradient(1000px 520px at 85% -10%, rgba(143,145,224,0.28), transparent 60%), #0a0a0a;
      color: #ededed; padding: 88px 96px; display: flex; flex-direction: column; justify-content: space-between;
    }
    .icon svg { width: 84px; height: 56px; }
    h1 { font-size: 112px; font-weight: 700; letter-spacing: -0.045em; line-height: 1; }
    p { margin-top: 28px; font-size: 36px; line-height: 1.35; color: rgba(237,237,237,0.62); max-width: 900px; }
    .url { font-size: 30px; font-family: ui-monospace, "SF Mono", Menlo, monospace; color: #8f91e0; }
  </style></head><body>
    <div class="icon">${icon}</div>
    <div>
      <h1>Sarang</h1>
      <p>Software developer focused on clean design and engaging, detail-obsessed user experiences.</p>
    </div>
    <div class="url">sarang.dev</div>
  </body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html);
  const png = await page.screenshot({ type: "png" });
  await browser.close();
  const out = path.join(ROOT, "public/og.png");
  await writeFile(out, png);
  console.log(`wrote public/og.png (${(png.length / 1024).toFixed(1)} KB)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
