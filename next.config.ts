import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.mzstatic.com" },
    ],
  },
};

export default nextConfig;