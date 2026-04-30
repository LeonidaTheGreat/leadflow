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

function removeStaleNextBuildLock() {
  const lockPath = path.resolve(__dirname, '..', '.next', 'lock')
  if (!fs.existsSync(lockPath)) {
    return
  }

  // Check for an active next build process before removing the lock
  // pgrep exits 1 (throws) when no match is found — that's the safe case
  try {
    const ps = execSync('pgrep -f "node_modules/.bin/next"', { encoding: 'utf8' })
    if (ps.trim()) {
      console.log('⏭ next build is already running — skipping lock cleanup')
      return
    }
  } catch {
    // pgrep exits 1 when no match — safe to remove
  }

  fs.rmSync(lockPath, { force: true })
  console.log('✅ Removed stale .next/lock before build')
}

removeStaleNextBuildLock()
