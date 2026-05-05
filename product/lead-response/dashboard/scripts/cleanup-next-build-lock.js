#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const STALE_AGE_MS = 10 * 60 * 1000 // 10 minutes: lock older than this is always stale
const WAIT_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes max to wait for a concurrent build
const POLL_INTERVAL_MS = 2000 // 2 seconds between polls

function isProcessAlive(pid) {
  try {
    execSync(`kill -0 ${pid}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function getPPID(pid) {
  try {
    const out = execSync(`ps -o ppid= -p ${pid}`, { encoding: 'utf8' }).trim()
    return out ? Number(out) : null
  } catch {
    return null
  }
}

// Returns PIDs of non-orphaned `next build` processes.
// Orphaned = parent or grandparent is dead (chain: quality-audit → npm run build → next build).
function getActiveNextBuildPids() {
  let pids
  try {
    const out = execSync('pgrep -f "node_modules/.bin/next build"', { encoding: 'utf8' })
    pids = out.trim().split('\n').filter(Boolean)
  } catch {
    return [] // pgrep exits 1 when no match
  }

  if (pids.length === 0) return []

  const active = []
  for (const pidStr of pids) {
    const pid = Number(pidStr)
    const ppid = getPPID(pid)
    if (!ppid || !isProcessAlive(ppid)) continue // parent dead — orphaned

    const gppid = getPPID(ppid)
    if (!gppid || !isProcessAlive(gppid)) continue // grandparent dead — orphaned chain

    active.push(pid)
  }
  return active
}

// Polls until no active build PIDs remain or maxWaitMs elapses.
// Returns the still-active PIDs when done (empty = all finished).
async function waitForBuildsToFinish(maxWaitMs = WAIT_TIMEOUT_MS, pollIntervalMs = POLL_INTERVAL_MS) {
  const deadline = Date.now() + maxWaitMs
  let active = getActiveNextBuildPids()
  while (active.length > 0 && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    active = getActiveNextBuildPids()
  }
  return active
}

async function removeStaleNextBuildLock() {
  const lockPath = path.resolve(__dirname, '..', '.next', 'lock')
  if (!fs.existsSync(lockPath)) return

  const lockStat = fs.statSync(lockPath)
  const lockAgeMs = Date.now() - lockStat.mtimeMs

  if (lockAgeMs >= STALE_AGE_MS) {
    // Lock is old enough to be unconditionally stale — kill and remove
    try { execSync("pkill -f 'node_modules/.bin/next'", { stdio: 'ignore' }) } catch {}
    fs.rmSync(lockPath, { force: true })
    console.log(`Removed stale .next/lock (age: ${Math.round(lockAgeMs / 60000)}m) before build`)
    return
  }

  // Lock is fresh — wait for any legitimate concurrent build to finish
  const remaining = await waitForBuildsToFinish()

  if (remaining.length > 0) {
    // Build timed out — force-remove so our build can proceed
    try { execSync("pkill -f 'node_modules/.bin/next'", { stdio: 'ignore' }) } catch {}
    fs.rmSync(lockPath, { force: true })
    console.log('Removed stuck .next/lock (concurrent build timed out) before build')
  } else {
    // All builds finished (or were orphaned) — safe to remove the leftover lock
    fs.rmSync(lockPath, { force: true })
    console.log(`Removed .next/lock (age: ${Math.round(lockAgeMs / 1000)}s, builds done) before build`)
  }
}

module.exports = { getActiveNextBuildPids, waitForBuildsToFinish }

// Only run side effects when executed directly (not required by tests)
if (require.main === module) {
  removeStaleNextBuildLock().catch(err => {
    console.error('cleanup-next-build-lock error:', err.message)
    process.exit(1)
  })
}
