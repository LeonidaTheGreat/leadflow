#!/usr/bin/env node
'use strict'
/*
TASK SPEC (dbfe5cb1-99c2-4134-8d4d-f361f335fa4f)
What:
- Change product/lead-response/dashboard/scripts/cleanup-next-build-lock.js:
  - getActiveNextBuildPids() to scope process detection to this dashboard directory only.
  - Add helper to safely escape absolute paths used in the pgrep regex.
- Change product/lead-response/dashboard/tests/unit/cleanup-next-build-lock.test.ts:
  - Update assertions for the new scoped pgrep pattern.
- Change product/lead-response/dashboard/app/api/page-views/route.ts:
  - Remove non-route export fields and consume shared page tracking helpers from lib.
- Add product/lead-response/dashboard/lib/page-views.ts:
  - Define tracked page constants and `isTrackedPage()` helper outside the route module.
- Change product/lead-response/dashboard/__tests__/page-view-logger.test.ts:
  - Import `isTrackedPage` from the new helper module.

Verify:
- cd product/lead-response/dashboard && npx next build (expect build starts without false "next build running" wait from unrelated processes).
- cd product/lead-response/dashboard && npm test -- tests/unit/cleanup-next-build-lock.test.ts (expect passing tests).
- cd product/lead-response/dashboard && npm test -- __tests__/page-view-logger.test.ts (expect passing tests).
- cd product/lead-response/dashboard && npm run build (expect success).

Boundaries:
- Do not modify app/components/business logic.
- Do not change database schema, routes, or services outside dashboard build-lock script behavior.
- Do not alter deployment config or unrelated scripts.
*/

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// A build running longer than this is stuck — remove the lock regardless
const STALE_AGE_MS = 10 * 60 * 1000 // 10 minutes
const PROJECT_ROOT = path.resolve(__dirname, '..')

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getPPID(pid) {
  try {
    const out = execSync(`ps -o ppid= -p ${pid}`, { encoding: 'utf8' }).trim()
    return out ? Number(out) : null
  } catch {
    return null
  }
}

function isProcessAlive(pid) {
  try {
    execSync(`kill -0 ${pid}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// Returns PIDs of genuine (non-orphaned) `next build` processes.
// Orphaned = parent or grandparent is dead. We walk two levels up because the
// typical chain is: quality-audit → npm run build → next build. A dead
// grandparent means the chain is abandoned even if npm is still a zombie.
function getActiveNextBuildPids() {
  let rawPids
  try {
    const scopedPattern = `${escapeRegex(PROJECT_ROOT)}/node_modules/(\\.bin/next|next/dist/bin/next) build`
    const out = execSync(`pgrep -f '${scopedPattern}'`, { encoding: 'utf8' })
    rawPids = out.trim().split('\n').filter(Boolean).map(Number)
  } catch {
    return [] // pgrep exits 1 when no match
  }

  return rawPids.filter(pid => {
    const ppid = getPPID(pid)
    if (!ppid || !isProcessAlive(ppid)) return false

    const gppid = getPPID(ppid)
    if (!gppid || !isProcessAlive(gppid)) return false

    return true
  })
}

// Waits up to maxWaitMs for all active builds to finish. Returns any still-running PIDs.
async function waitForBuildsToFinish(maxWaitMs, pollIntervalMs) {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const remaining = getActiveNextBuildPids()
    if (remaining.length === 0) return []
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }
  return getActiveNextBuildPids()
}

async function main() {
  const lockPath = path.resolve(__dirname, '..', '.next', 'lock')
  if (!fs.existsSync(lockPath)) return

  const lockStat = fs.statSync(lockPath)
  const lockAgeMs = Date.now() - lockStat.mtimeMs

  // If lock is fresh, wait for any genuinely running build to finish before proceeding
  if (lockAgeMs < STALE_AGE_MS) {
    const activePids = getActiveNextBuildPids()
    if (activePids.length > 0) {
      console.log(`next build running (pid ${activePids.join(',')}), waiting up to 5m…`)
      const remaining = await waitForBuildsToFinish(5 * 60 * 1000, 5000)
      if (remaining.length > 0) {
        console.log(`build still running after 5m wait — treating lock as stuck, removing`)
      } else if (!fs.existsSync(lockPath)) {
        // Build finished and cleaned up its own lock
        return
      }
      // Build finished but lock persists — fall through to remove it
    }
  }

  // Lock is stale (>10 min) or all matching processes are orphaned — clean up
  fs.rmSync(lockPath, { force: true })
  const ageDesc = lockAgeMs >= 60000
    ? `${Math.round(lockAgeMs / 60000)}m`
    : `${Math.round(lockAgeMs / 1000)}s`
  console.log(`Removed stale .next/lock (age: ${ageDesc}) before build`)
}

if (require.main === module) {
  main().catch(err => {
    console.error('cleanup-next-build-lock:', err.message)
    process.exit(1)
  })
}

module.exports = { getActiveNextBuildPids, waitForBuildsToFinish }
