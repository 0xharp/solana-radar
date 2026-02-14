import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Suppress dynamic server usage errors for Supabase calls at build time
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
