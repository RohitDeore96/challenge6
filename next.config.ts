import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Standard output: Vercel detects Next.js automatically and builds with
  // its own optimised pipeline; `next start` works locally without the
  // standalone copy step.
  turbopack: {
    root: projectRoot,
  },
  // Type errors must fail the build (quality gate, see docs/DEVELOPMENT_LOG.md).
  reactStrictMode: true,
};

export default nextConfig;
