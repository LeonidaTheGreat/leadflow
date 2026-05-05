#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const STALE_AGE_MS = 10 * 60 * 1000 // lock older than this is unconditionally stale
const WAIT_TIMEOUT_MS = 5 * 60 * 1000 // max time to wait for a concurrent build
const POLL_INTERVAL_MS = 2000 // poll interval while waiting

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
// Uses "next build" not just "next" to avoid matching the Next.js dev server.
// Orphaned = parent or grandparent is dead (chain: quality-audit -> npm -> next build).
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

// Polls until no active build PIDs remain or maxWaitMs elapses.
// Returns any still-running PIDs when done (empty = all finished or orphaned).
async function waitForBuildsToFinish(maxWaitMs, pollIntervalMs) {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const remaining = getActiveNextBuildPids()
    if (remaining.length === 0) return []
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }
  return getActiveNextBuildPids()
}

async function removeStaleNextBuildLock() {
  const lockPath = path.resolve(__dirname, '..', '.next', 'lock')
  if (!fs.existsSync(lockPath)) return

  const lockStat = fs.statSync(lockPath)
  const lockAgeMs = Date.now() - lockStat.mtimeMs

  if (lockAgeMs >= STALE_AGE_MS) {
    // Lock is old enough to be unconditionally stale
    try { execSync("pkill -f 'node_modules/.bin/next build'", { stdio: 'ignore' }) } catch {}
    fs.rmSync(lockPath, { force: true })
    console.log(`Removed stale .next/lock (age: ${Math.round(lockAgeMs / 60000)}m) before build`)
    return
  }

  // Lock is fresh -- check for a concurrent build
  const activePids = getActiveNextBuildPids()
  if (activePids.length === 0) {
    // No active build -- lock is a leftover from a crashed build
    fs.rmSync(lockPath, { force: true })
    const ageDesc = lockAgeMs >= 60000
      ? `${Math.round(lockAgeMs / 60000)}m`
      : `${Math.round(lockAgeMs / 1000)}s`
    console.log(`Removed orphaned .next/lock (age: ${ageDesc}, no active build) before build`)
    return
  }

  // A concurrent build is running -- wait for it to finish
  const remaining = await waitForBuildsToFinish(WAIT_TIMEOUT_MS, POLL_INTERVAL_MS)

  // Re-check: build may have cleaned up its own lock on success
  if (!fs.existsSync(lockPath)) return

  // Lock still exists -- the concurrent build crashed or timed out
  if (remaining.length > 0) {
    try { execSync("pkill -f 'node_modules/.bin/next build'", { stdio: 'ignore' }) } catch {}
  }
  fs.rmSync(lockPath, { force: true })
  const reason = remaining.length > 0 ? 'timed out' : 'crashed'
  console.log(`Removed .next/lock (concurrent build ${reason}) before build`)
}

module.exports = { getActiveNextBuildPids, waitForBuildsToFinish }

if (require.main === module) {
  removeStaleNextBuildLock().catch(err => {
    console.error('cleanup-next-build-lock:', err.message)
    process.exit(1)
  })
}
