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
  // PWA: Ensure Service Worker is served with correct headers
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
