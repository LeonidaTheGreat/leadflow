import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly transpile AI SDK packages (fixes Turbopack module resolution)
  transpilePackages: ['@ai-sdk/openai', '@ai-sdk/anthropic', 'ai'],
  // Silence multiple-lockfile warning when building inside a monorepo
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
