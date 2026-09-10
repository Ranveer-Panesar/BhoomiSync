import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack (Next.js 16 default) — no webpack config needed
  turbopack: {},
  env: {
    NEXT_PUBLIC_API_URL:      process.env.NEXT_PUBLIC_API_URL      || "http://localhost:8000",
    NEXT_PUBLIC_TILESERV_URL: process.env.NEXT_PUBLIC_TILESERV_URL || "http://localhost:7800",
  },
};

export default nextConfig;
