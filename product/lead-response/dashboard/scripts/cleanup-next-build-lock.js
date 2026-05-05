#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// A build running longer than this is stuck — remove the lock regardless
const STALE_AGE_MS = 10 * 60 * 1000 // 10 minutes

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

  // If lock is fresh, check for a genuinely running build first
  if (lockAgeMs < STALE_AGE_MS) {
    const activePids = getActiveNextBuildPids()
    if (activePids.length > 0) {
      console.log('next build is actively running — skipping lock cleanup')
      return
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
