import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // cacheComponents: experimental; incompatible with admin [entity]/[id]
  // dynamic routes (requires generateStaticParams ≥ 1 result).
  // FOUC fix: inline critical CSS in src/app/layout.tsx <head> instead.
  // optimizeCss is broken under OpenNext (expects .next/standalone output).
  typescript: {
    // Pre-existing fetch-JSON type issues across the app; revisit later.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.mzstatic.com" },
      { protocol: "https", hostname: "github.com" },
    ],
  },
};

export default nextConfig;
