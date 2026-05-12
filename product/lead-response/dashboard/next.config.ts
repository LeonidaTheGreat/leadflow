/*
TASK SPEC (a62941ec-48cc-48ac-b51e-3ae8caaef383)
What:
- Change product/lead-response/dashboard/next.config.ts to keep dashboard-root scoping and package transpilation for AI SDK modules used in API routes.
- Change product/lead-response/dashboard/package.json build script from `next build` to `next build --webpack` to bypass Turbopack pages-manifest generation failure.

Verify:
- cd product/lead-response/dashboard && npm run build (expect exit 0 and successful Next production build output).
- cd product/lead-response/dashboard && npx --no-install next build --webpack (expect exit 0).
- cd product/lead-response/dashboard && rg -n "\"build\":|transpilePackages|turbopack" package.json next.config.ts (confirm intended config only).

Boundaries:
- Do not modify dashboard application/business logic files under app/, components/, or lib/.
- Do not alter database schema, migrations, routes, or backend services outside dashboard build configuration.
- Do not change deployment wiring or Vercel project linkage.
*/
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
