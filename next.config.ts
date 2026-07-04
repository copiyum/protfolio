import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // cacheComponents: experimental; incompatible with admin [entity]/[id]
  // dynamic routes (requires generateStaticParams ≥ 1 result).
  // FOUC fix: inline critical CSS in src/app/layout.tsx <head> instead.
  // optimizeCss is broken under OpenNext (expects .next/standalone output).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.mzstatic.com" },
      { protocol: "https", hostname: "github.com" },
    ],
  },
};

export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    initOpenNextCloudflareForDev();
  }
  return nextConfig;
}
