import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Set workspace root to the dashboard directory to avoid ambiguous lockfile warning
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
