// @ts-check
const { defineConfig, devices } = require('@playwright/test')

/**
 * LeadFlow Playwright Configuration
 *
 * Browser tests for critical user flows. Runs on 6h cadence via genome heartbeat.
 * Uses data-testid attributes for selector resilience.
 *
 * Usage:
 *   npx playwright test                          # all tests against production
 *   npx playwright test --project=chromium        # chromium only
 *   npx playwright test tests/browser/auth.spec.js # single suite
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test  # local
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://leadflow-ai-five.vercel.app'

module.exports = defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 1 retry always — handles Vercel cold-start latency spikes that cause spurious failures
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  timeout: 30000,
  expect: { timeout: 10000 },

  reporter: process.env.CI
    ? [['json', { outputFile: 'playwright-report.json' }]]
    : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // Reasonable timeouts for Vercel cold starts
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
