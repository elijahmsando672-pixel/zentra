import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep Next.js file tracing inside this app when another lockfile exists above it.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
