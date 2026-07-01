import type { NextConfig } from "next";
import module from "module";
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.mzstatic.com" },
    ],
  },
};

export default nextConfig;
