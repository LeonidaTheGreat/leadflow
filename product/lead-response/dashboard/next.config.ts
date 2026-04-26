import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Explicitly transpile AI SDK packages (fixes Turbopack module resolution)
  transpilePackages: ['@ai-sdk/openai', '@ai-sdk/anthropic', 'ai'],
  turbopack: {
    // Use the dashboard directory as the workspace root to prevent Next.js from
    // scanning upward to the repo root and detecting the server-side package-lock.json
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
