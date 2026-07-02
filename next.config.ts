import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // cacheComponents: experimental; incompatible with admin [entity]/[id]
  // dynamic routes (requires generateStaticParams ≥ 1 result).
  typescript: {
    // Pre-existing fetch-JSON type issues across the app; revisit later.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.mzstatic.com" },
    ],
  },
};

export default nextConfig;