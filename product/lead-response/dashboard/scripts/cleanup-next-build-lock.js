#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// A build running longer than this is considered stuck — force cleanup regardless
const STALE_AGE_MS = 10 * 60 * 1000 // 10 minutes

function isProcessAlive(pid) {
  // PID 0 = kernel, PID 1 = init/launchd — never treat as a live build ancestor
  if (pid <= 1) return false
  try {
    execSync(`kill -0 ${pid}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function getParentPid(pid) {
  try {
    const out = execSync(`ps -o ppid= -p ${pid}`, { encoding: 'utf8' }).trim()
    return out ? Number(out) : null
  } catch {
    return null
  }
}

// Returns true only when at least one non-orphaned `next build` process is alive.
// An orphaned process has a dead parent or grandparent — this happens when the
// quality audit's execSync timeout fires and SIGKILL kills `npm run build`, leaving
// `next build` as an orphan that still holds the lock file.
// Process chain: quality-audit → npm run build → next build
// We check two levels up: if either npm (parent) or quality-audit (grandparent) is
// dead, the build chain is abandoned and the lock is safe to remove.
function isNextBuildRunning() {
  let pids
  try {
    const out = execSync('pgrep -f "node_modules/.bin/next build"', { encoding: 'utf8' })
    pids = out.trim().split('\n').filter(Boolean)
  } catch {
    return false // pgrep exits 1 when no match — no build running
  }

  if (pids.length === 0) return false

  for (const pid of pids) {
    const ppid = getParentPid(Number(pid))
    if (!ppid || !isProcessAlive(ppid)) continue // parent dead — orphaned

    const gppid = getParentPid(ppid)
    if (!gppid || !isProcessAlive(gppid)) continue // grandparent dead — orphaned chain

    return true // both parent and grandparent alive — legitimate concurrent build
  }

  return false // all matching processes are orphaned
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
