// @ts-check
'use strict'

/**
 * Playwright globalSetup — ensures Chromium is installed and selects base URL.
 *
 * Two responsibilities:
 *
 * 1. Browser install: The genome runs `npx playwright test` without a prior
 *    `playwright install` step. When ~/.cache/ms-playwright is cleared, every
 *    test fails with "Executable doesn't exist". This setup installs Chromium
 *    if the binary is missing (no-op when already present).
 *
 * 2. Base URL selection: If PLAYWRIGHT_BASE_URL is already set, use it.
 *    Otherwise, prefer the local Next.js dev server on port 3030 (always
 *    running on the Mac Mini). Falling back to the live Vercel deployment
 *    causes ~33/47 test failures on cold starts (Vercel cold boot >15s
 *    exceeds navigation/perf timeouts). Local server is stable and fast.
 */

const { execFileSync } = require('child_process')
const http = require('http')
const path = require('path')
const fs = require('fs')

const LIVE_CHECKOUT = '/Users/clawdbot/projects/leadflow'
const LOCAL_URL = 'http://localhost:3030'
const VERCEL_URL = 'https://leadflow-ai-five.vercel.app'

/**
 * Resolve the playwright CLI binary, preferring the locally installed version.
 * Falls back to the live-checkout node_modules so worktrees without their own
 * node_modules can still run the install step.
 */
function resolvePlaywrightBin() {
  const candidates = [
    path.join(__dirname, '..', 'node_modules', '.bin', 'playwright'),
    path.join(LIVE_CHECKOUT, 'node_modules', '.bin', 'playwright'),
  ]
  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin
  }
  return null
}

/**
 * Check if the local Next.js dev server is responding on the given URL.
 * Returns true if the server responds with any HTTP status within 3 seconds.
 */
function isLocalServerReachable(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url)
    const req = http.request(
      { hostname: parsed.hostname, port: parsed.port || 80, path: '/', method: 'HEAD', timeout: 3000 },
      (res) => { resolve(res.statusCode < 600) }
    )
    req.on('error', () => resolve(false))
    req.on('timeout', () => { req.destroy(); resolve(false) })
    req.end()
  })
}

async function globalSetup() {
  // ── 1. Select base URL ────────────────────────────────────────────────────
  if (!process.env.PLAYWRIGHT_BASE_URL) {
    const localAvailable = await isLocalServerReachable(LOCAL_URL)
    if (localAvailable) {
      process.env.PLAYWRIGHT_BASE_URL = LOCAL_URL
      process.stderr.write(`[playwright-setup] Using local server: ${LOCAL_URL}\n`)
    } else {
      process.env.PLAYWRIGHT_BASE_URL = VERCEL_URL
      process.stderr.write(`[playwright-setup] Local server not reachable — falling back to Vercel: ${VERCEL_URL}\n`)
    }
  } else {
    process.stderr.write(`[playwright-setup] Using PLAYWRIGHT_BASE_URL=${process.env.PLAYWRIGHT_BASE_URL}\n`)
  }

  // ── 2. Install Chromium if missing ────────────────────────────────────────
  const bin = resolvePlaywrightBin()
  if (!bin) {
    console.warn('[playwright-setup] No local playwright binary found; skipping browser install.')
    return
  }

  try {
    execFileSync(bin, ['install', 'chromium'], { stdio: ['ignore', 'ignore', 'inherit'] })
  } catch (err) {
    console.warn('[playwright-setup] playwright install chromium failed:', err.message)
  }
}

module.exports = globalSetup
