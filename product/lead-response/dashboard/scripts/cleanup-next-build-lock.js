#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// A build taking longer than this is considered stuck — remove lock regardless
const STALE_AGE_MS = 10 * 60 * 1000 // 10 minutes

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

// Returns the PID holding the lock file open, or null if not held.
// lsof -t exits 1 when no process has the file open.
// This is strictly correct: checks actual file handles, not process name patterns.
// Process-name checks (pgrep, ps+awk) cause false positives when a Claude agent
// has the path in its task description argument.
function getLockHolderPID(lockPath) {
  try {
    const out = execSync(`lsof -t "${lockPath}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    const pid = out.trim()
    return pid ? Number(pid) : null
  } catch {
    return null
  }
}

// An orphaned process has a dead parent or grandparent. Check two levels because
// the typical build chain is: quality-audit → npm run build → next build.
// A dead grandparent means the whole chain is orphaned even if npm is still alive.
function isOrphaned(pid) {
  const ppid = getPPID(pid)
  if (!ppid || !isProcessAlive(ppid)) return true

  const gppid = getPPID(ppid)
  if (!gppid || !isProcessAlive(gppid)) return true

  return false
}

function removeStaleNextBuildLock() {
  const lockPath = path.resolve(__dirname, '..', '.next', 'lock')
  if (!fs.existsSync(lockPath)) return

  const lockStat = fs.statSync(lockPath)
  const lockAgeMs = Date.now() - lockStat.mtimeMs

  const holderPID = getLockHolderPID(lockPath)

  if (holderPID) {
    if (lockAgeMs < STALE_AGE_MS && !isOrphaned(holderPID)) {
      // Lock is recent and held by a process with a live ancestor — legitimate build
      console.log('⏭ next build is actively running — skipping lock cleanup')
      return
    }
    // Lock is held but the process is orphaned or the build has been stuck too long
    try {
      execSync(`kill ${holderPID}`, { stdio: 'ignore' })
    } catch { /* already exited */ }
  }

  fs.rmSync(lockPath, { force: true })
  const ageDesc = lockAgeMs >= 60000
    ? `${Math.round(lockAgeMs / 60000)}m`
    : `${Math.round(lockAgeMs / 1000)}s`
  const reason = holderPID ? `killed orphaned PID ${holderPID}, ` : ''
  console.log(`✅ Removed stale .next/lock (${reason}age: ${ageDesc}) before build`)
}

removeStaleNextBuildLock()
