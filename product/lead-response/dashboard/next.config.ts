import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Set the turbopack root to this dashboard directory to avoid confusion
  // from multiple lockfiles in the monorepo workspace. Without this, Next.js
  // may select the wrong workspace root and cause intermittent Vercel build failures.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
