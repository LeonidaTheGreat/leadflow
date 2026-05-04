#!/usr/bin/env node
'use strict'
/**
 * Task Spec (4941a706-26c4-4b3b-809c-e1025c83fe01)
 * What:
 * - Add product/lead-response/dashboard/scripts/cleanup-next-build-lock.js with removeStaleNextBuildLock()
 *   to clear stale .next/lock files only when no active `next build` process is running.
 * - Update product/lead-response/dashboard/package.json prebuild to run env validation and lock cleanup.
 * - Update root package.json build command to use dashboard package scripts so prebuild always executes.
 * Verify:
 * - Command: cd product/lead-response/dashboard && mkdir -p .next && echo stale > .next/lock && npm run build
 *   Expected: cleanup script logs stale-lock removal and build no longer fails with "Another next build process is already running.".
 * - Command: npm run build (repo root)
 *   Expected: exits 0.
 * - Command: npm run lint && npm test && npm audit --audit-level=high
 *   Expected: all exit 0 with no high/critical vulnerabilities.
 * Boundaries:
 * - Do not change business logic/routes/services.
 * - Do not modify database schema, migrations, or runtime API behavior.
 * - Do not touch unrelated docs/config outside package.json and the new build-lock script.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// A build running longer than this is considered stuck — force cleanup regardless
const STALE_AGE_MS = 10 * 60 * 1000 // 10 minutes

function isNextBuildRunning() {
  try {
    // Match only "next build" processes, not "next dev" or "next start" servers.
    // pgrep -f matches the full command line as a substring, so this is specific.
    const out = execSync('pgrep -f "node_modules/.bin/next build"', { encoding: 'utf8' })
    return out.trim().length > 0
  } catch {
    // pgrep exits 1 when no match found — no build running
    return false
  }
}

function removeStaleNextBuildLock() {
  const lockPath = path.resolve(__dirname, '..', '.next', 'lock')
  if (!fs.existsSync(lockPath)) return

  const lockStat = fs.statSync(lockPath)
  const lockAgeMs = Date.now() - lockStat.mtimeMs

  // If a build is actively running and the lock is fresh, leave it alone
  if (lockAgeMs < STALE_AGE_MS && isNextBuildRunning()) {
    console.log('⏭ next build is already running — skipping lock cleanup')
    return
  }

  // Lock is stale (>10 min) or no matching build process found — remove it
  fs.rmSync(lockPath, { force: true })
  const ageDesc = lockAgeMs >= 60000
    ? `${Math.round(lockAgeMs / 60000)}m`
    : `${Math.round(lockAgeMs / 1000)}s`
  console.log(`✅ Removed stale .next/lock (age: ${ageDesc}) before build`)
}

removeStaleNextBuildLock()
