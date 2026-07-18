// @ts-check
'use strict'

/**
 * Playwright globalSetup — ensures the Chromium browser binary is installed.
 *
 * The genome runs `npx playwright test` directly (project.config.json browser_tests.command)
 * without a prior `playwright install` step. When the ~/.cache/ms-playwright cache is cleared
 * (OS cache purge, fresh machine, CI), every test fails with "Executable doesn't exist".
 *
 * This setup runs before any test and installs Chromium if the binary is missing.
 * It is a no-op when the binary is already present (playwright install detects this).
 */

const { execFileSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const LIVE_CHECKOUT = '/Users/clawdbot/projects/leadflow'

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

async function globalSetup() {
  const bin = resolvePlaywrightBin()
  if (!bin) {
    console.warn('[playwright-setup] No local playwright binary found; skipping browser install.')
    return
  }

  try {
    execFileSync(bin, ['install', 'chromium'], { stdio: 'inherit' })
  } catch (err) {
    console.warn('[playwright-setup] playwright install chromium failed:', err.message)
  }
}

module.exports = globalSetup
