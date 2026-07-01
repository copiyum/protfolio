import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { reactCompiler: true },
  cacheComponents: true,
};

export default nextConfig;