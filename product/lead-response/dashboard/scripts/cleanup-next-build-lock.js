#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// A build taking longer than this is stuck — remove the lock regardless of process state
const STALE_AGE_MS = 10 * 60 * 1000 // 10 minutes

function isNextBuildRunning() {
  // Match processes where node is the executor and next is the script path.
  // Using ps args column to avoid false positives from processes that merely mention
  // "node_modules/.bin/next" inside a long string argument (e.g. a Claude prompt).
  try {
    execSync(
      "ps ax -o args | awk '/^[^ ]*node[[:space:]].*node_modules\\/\\.bin\\/next/ { found=1 } END { exit !found }'",
      { stdio: ['ignore', 'ignore', 'ignore'] }
    )
    return true
  } catch {
    return false
  }
}

function removeStaleNextBuildLock() {
  const lockPath = path.resolve(__dirname, '..', '.next', 'lock')
  if (!fs.existsSync(lockPath)) return

  const lockStat = fs.statSync(lockPath)
  const lockAgeMs = Date.now() - lockStat.mtimeMs

  // Recent lock: only skip cleanup if a real next build process is actually running
  if (lockAgeMs < STALE_AGE_MS && isNextBuildRunning()) {
    console.log('⏭ next build is actively running — skipping lock cleanup')
    return
  }

  // Stale lock (too old, or no active process) — clean up
  if (lockAgeMs >= STALE_AGE_MS) {
    // Kill any stuck next build process before removing the lock
    try {
      execSync("pkill -f 'node_modules/.bin/next'", { stdio: 'ignore' })
    } catch { /* ignore — no process to kill */ }
  }

  fs.rmSync(lockPath, { force: true })
  const ageDesc = lockAgeMs >= 60000
    ? `${Math.round(lockAgeMs / 60000)}m`
    : `${Math.round(lockAgeMs / 1000)}s`
  console.log(`✅ Removed stale .next/lock (age: ${ageDesc}) before build`)
}

removeStaleNextBuildLock()
