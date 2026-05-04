#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// A build running longer than this is considered stuck — force cleanup regardless
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

// Returns true only if at least one non-orphaned `next build` process is alive.
// Orphaned = parent or grandparent is dead. We check two levels up because the
// typical build chain is: quality-audit -> npm run build -> next build.
// A dead grandparent means the whole chain is abandoned even if npm run build
// is still alive as a zombie child.
// Uses "next build" pattern (not just "next") to avoid false-positives from
// `next dev` or `next start` servers that are unrelated to the build.
function isNextBuildRunning() {
  let pids
  try {
    // "node_modules/.bin/next build" is specific to build — excludes dev/start servers
    const out = execSync('pgrep -f "node_modules/.bin/next build"', { encoding: 'utf8' })
    pids = out.trim().split('\n').filter(Boolean)
  } catch {
    return false // pgrep exits 1 when no match
  }

  if (pids.length === 0) return false

  for (const pid of pids) {
    const ppid = getPPID(Number(pid))
    if (!ppid || !isProcessAlive(ppid)) continue // parent dead — orphaned

    const gppid = getPPID(ppid)
    if (!gppid || !isProcessAlive(gppid)) continue // grandparent dead — orphaned chain

    return true // both parent and grandparent alive — legitimate concurrent build
  }

  return false // all found processes are orphaned
}

function removeStaleNextBuildLock() {
  const lockPath = path.resolve(__dirname, '..', '.next', 'lock')
  if (!fs.existsSync(lockPath)) return

  const lockStat = fs.statSync(lockPath)
  const lockAgeMs = Date.now() - lockStat.mtimeMs

  // If a fresh, non-orphaned build is running, leave the lock alone
  if (lockAgeMs < STALE_AGE_MS && isNextBuildRunning()) {
    console.log('⏭ next build is already running — skipping lock cleanup')
    return
  }

  // Lock is stale (>10 min) or all matching processes are orphaned — remove it
  fs.rmSync(lockPath, { force: true })
  const ageDesc = lockAgeMs >= 60000
    ? `${Math.round(lockAgeMs / 60000)}m`
    : `${Math.round(lockAgeMs / 1000)}s`
  console.log(`✅ Removed stale .next/lock (age: ${ageDesc}) before build`)
}

removeStaleNextBuildLock()
