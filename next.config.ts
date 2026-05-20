import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance: Configure remote image patterns for potential next/image migration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'phimimg.com',
      },
      {
        protocol: 'https',
        hostname: 'phimapi.com',
      },
      {
        protocol: 'https',
        hostname: 'img.phimapi.com',
      },
    ],
  },
};

export default nextConfig;
