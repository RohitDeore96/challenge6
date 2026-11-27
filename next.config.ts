import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Standalone output keeps local/production containers self-contained.
  // Vercel detects Next.js automatically and builds with the same config.
  output: "standalone",
  // Pin the Turbopack workspace root to this project directory.
  turbopack: {
    root: projectRoot,
  },
  // Type errors must fail the build (quality gate, see docs/DEVELOPMENT_LOG.md).
  reactStrictMode: true,
};

export default nextConfig;
