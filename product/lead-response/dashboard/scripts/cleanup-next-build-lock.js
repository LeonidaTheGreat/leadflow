#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// A build running longer than this is stuck — remove the lock regardless
const STALE_AGE_MS = 10 * 60 * 1000 // 10 minutes

// Max time to wait for a genuine (non-orphaned) build before killing it.
// Chosen so total (wait + new build ~60s) fits within the quality gate's 180s timeout.
const GENUINE_WAIT_MS = 90 * 1000 // 90 seconds

// Max time to wait for orphaned builds before killing them.
const ORPHAN_WAIT_MS = 30 * 1000 // 30 seconds

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
    const out = execSync('pgrep -f "node_modules/.bin/next build"', { encoding: 'utf8' })
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

// Returns ALL `next build` PIDs without the orphan filter.
function getAllNextBuildPids() {
  try {
    const out = execSync('pgrep -f "node_modules/.bin/next build"', { encoding: 'utf8' })
    return out.trim().split('\n').filter(Boolean).map(Number)
  } catch {
    return []
  }
}

// Send SIGTERM to all given pids — prevents them from deleting our new lock when they exit.
function killPids(pids) {
  for (const pid of pids) {
    try { execSync(`kill ${pid}`) } catch {}
  }
}

// Waits up to maxWaitMs for all active (non-orphaned) builds to finish.
async function waitForBuildsToFinish(maxWaitMs, pollIntervalMs) {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const remaining = getActiveNextBuildPids()
    if (remaining.length === 0) return []
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }
  return getActiveNextBuildPids()
}

// Waits up to maxWaitMs for ALL builds (including orphaned) to finish.
async function waitForAllBuildsToFinish(maxWaitMs, pollIntervalMs) {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const remaining = getAllNextBuildPids()
    if (remaining.length === 0) return []
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }
  return getAllNextBuildPids()
}

async function main() {
  const lockPath = path.resolve(__dirname, '..', '.next', 'lock')
  if (!fs.existsSync(lockPath)) return

  const lockStat = fs.statSync(lockPath)
  const lockAgeMs = Date.now() - lockStat.mtimeMs

  if (lockAgeMs < STALE_AGE_MS) {
    const activePids = getActiveNextBuildPids()
    if (activePids.length > 0) {
      // Genuine (non-orphaned) build running — wait briefly, then kill if still stuck.
      // GENUINE_WAIT_MS keeps total (wait + new build) within the quality gate's 180s timeout.
      console.log(`next build running (pid ${activePids.join(',')}), waiting up to ${GENUINE_WAIT_MS / 1000}s…`)
      const remaining = await waitForBuildsToFinish(GENUINE_WAIT_MS, 5000)
      if (remaining.length > 0) {
        // Kill stuck process — otherwise it may delete our new lock when it eventually exits
        console.log(`build still running after ${GENUINE_WAIT_MS / 1000}s — killing pids ${remaining.join(',')} and removing lock`)
        killPids(remaining)
      } else if (!fs.existsSync(lockPath)) {
        // Build finished and cleaned up its own lock — nothing more to do
        return
      }
      // Build finished but lock persists (crashed without cleanup) — fall through to remove
    } else {
      // No genuine builds, but orphaned builds may still be actively compiling.
      // Wait briefly; if they don't finish, kill them to prevent lock interference.
      const orphanedPids = getAllNextBuildPids()
      if (orphanedPids.length > 0) {
        console.log(`orphaned next build(s) (pid ${orphanedPids.join(',')}), waiting up to ${ORPHAN_WAIT_MS / 1000}s…`)
        const stillRunning = await waitForAllBuildsToFinish(ORPHAN_WAIT_MS, 5000)
        if (!fs.existsSync(lockPath)) return // orphan cleaned up its own lock
        if (stillRunning.length > 0) {
          // Kill timed-out orphans — prevents them from deleting our new lock later
          console.log(`orphaned builds still running after ${ORPHAN_WAIT_MS / 1000}s — killing pids ${stillRunning.join(',')}`)
          killPids(stillRunning)
        }
      }
    }
  }

  // Lock is stale (>10 min), holder was killed, or holder crashed — remove it
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

module.exports = { getActiveNextBuildPids, waitForBuildsToFinish, getAllNextBuildPids, waitForAllBuildsToFinish }
