import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Set workspace root to the dashboard directory to avoid ambiguous lockfile warning
    root: path.resolve(__dirname),
    // Resolve extensions for packages that Turbopack can't find with workspace root override
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'],
  },
  // Explicitly transpile AI SDK packages (fixes Turbopack module resolution in CI)
  transpilePackages: ['@ai-sdk/openai', '@ai-sdk/anthropic', 'ai'],
};

export default nextConfig;
