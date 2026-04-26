import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Explicitly transpile AI SDK packages (fixes Turbopack module resolution)
  transpilePackages: ['@ai-sdk/openai', '@ai-sdk/anthropic', 'ai'],
};

export default nextConfig;
