#!/usr/bin/env node
/*
TASK SPEC (a62941ec-48cc-48ac-b51e-3ae8caaef383)
What:
- Change file: /Users/clawdbot/projects/leadflow/product/lead-response/dashboard/scripts/cleanup-next-build-lock.js
- Functions: main() and helpers that clear stale .next build outputs when a lock is stale/orphaned.
- Goal: prevent flaky next build failures caused by stale lock + partial prior build artifacts.

Verify:
- cd /Users/clawdbot/projects/leadflow/product/lead-response/dashboard && npm run build
- cd /Users/clawdbot/projects/leadflow/product/lead-response/dashboard && npx --no-install next build --webpack
- Expected: both commands exit 0 and no lock/process collision errors.

Boundaries:
- Do not modify app routes/components/services.
- Do not change dependency versions.
- Do not touch database/schema/migrations.
*/
'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const STALE_AGE_MS = 10 * 60 * 1000
const NEXT_TRANSIENT_OUTPUT_DIRS = ['build', 'static', 'server', 'types', 'diagnostics', 'turbopack']

function getPPID(pid) {
  try {
    const out = execSync('ps -o ppid= -p ' + pid, { encoding: 'utf8' }).trim()
    return out ? Number(out) : null
  } catch {
    return null
  }
}

function isProcessAlive(pid) {
  try {
    execSync('kill -0 ' + pid, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function getActiveNextBuildPids() {
  let rawPids
  try {
    const out = execSync('pgrep -f "node_modules/.bin/next build"', { encoding: 'utf8' })
    rawPids = out.trim().split('\n').filter(Boolean).map(Number)
  } catch {
    return []
  }

  return rawPids.filter((pid) => {
    const ppid = getPPID(pid)
    if (!ppid || !isProcessAlive(ppid)) return false

    const gppid = getPPID(ppid)
    if (!gppid || !isProcessAlive(gppid)) return false

    return true
  })
}

async function waitForBuildsToFinish(maxWaitMs, pollIntervalMs) {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const remaining = getActiveNextBuildPids()
    if (remaining.length === 0) return []
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }
  return getActiveNextBuildPids()
}

async function main() {
  const nextDir = path.resolve(__dirname, '..', '.next')
  const lockPath = path.resolve(nextDir, 'lock')
  if (!fs.existsSync(lockPath)) return

  const lockStat = fs.statSync(lockPath)
  const lockAgeMs = Date.now() - lockStat.mtimeMs

  if (lockAgeMs < STALE_AGE_MS) {
    const activePids = getActiveNextBuildPids()
    if (activePids.length > 0) {
      console.log('next build running (pid ' + activePids.join(',') + '), waiting up to 5m...')
      const remaining = await waitForBuildsToFinish(5 * 60 * 1000, 5000)
      if (remaining.length > 0) {
        console.log('build still running after 5m wait - treating lock as stuck, removing')
      } else if (!fs.existsSync(lockPath)) {
        return
      }
    }
  }

  fs.rmSync(lockPath, { force: true })
  for (const dirName of NEXT_TRANSIENT_OUTPUT_DIRS) {
    fs.rmSync(path.resolve(nextDir, dirName), { recursive: true, force: true })
  }

  const ageDesc = lockAgeMs >= 60000
    ? String(Math.round(lockAgeMs / 60000)) + 'm'
    : String(Math.round(lockAgeMs / 1000)) + 's'
  console.log('Removed stale .next/lock (age: ' + ageDesc + ') and cleared transient build outputs before build')
}

if (require.main === module) {
  main().catch((err) => {
    console.error('cleanup-next-build-lock:', err.message)
    process.exit(1)
  })
}

module.exports = { getActiveNextBuildPids, waitForBuildsToFinish }
