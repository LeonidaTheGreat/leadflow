'use strict'
/**
 * Regression tests: genome step health — critical steps not running (task 94ae0f36).
 *
 * Root cause: heartbeat-wrapper.js called heartbeat-executor.js via execSync
 * with an 8-minute timeout. The heartbeat takes 50-80 minutes when slow steps
 * run (E2E tests, codebase rules, Playwright). SIGTERM from the timeout kills
 * the process before updateHeartbeatTimestamp() could run, so activity-state.json
 * was never updated — causing checkStepHealth() to fire "Heartbeat: last ran Xh ago"
 * alerts in a loop and spawn redundant fix tasks.
 *
 * Similarly, the watchdog in dispatcher-health.js used execSync with a short
 * timeout, blocking the dispatcher AND killing the heartbeat before completion.
 *
 * Three fixes applied (genome commits 0f69461, 0a65328):
 *   1. heartbeat-wrapper.js: executor timeout raised from 8 min to 100 min
 *   2. dispatcher-health.js: watchdog uses spawn+detach instead of execSync
 *   3. heartbeat-executor.js: writes start timestamp before the main try block
 *      so activity-state.json stays fresh even if the run is killed mid-way
 */
const fs = require('fs')
const path = require('path')

const GENOME_CORE = '/Users/clawdbot/.openclaw/genome/core'
const WRAPPER_PATH = path.join(GENOME_CORE, 'heartbeat-wrapper.js')
const DISPATCHER_HEALTH_PATH = path.join(GENOME_CORE, 'dispatcher-health.js')
const EXECUTOR_PATH = path.join(GENOME_CORE, 'heartbeat-executor.js')
const HEALTH_LOOP_PATH = path.join(GENOME_CORE, 'loops', 'health-loop.js')

describe('Genome step health regression — heartbeat timeout fixes (94ae0f36)', () => {
  test('heartbeat-wrapper.js executor timeout is at least 90 minutes', () => {
    const source = fs.readFileSync(WRAPPER_PATH, 'utf8')
    const match = source.match(/execSync\(executorArgs[^)]+timeout:\s*(\d+)\s*\*\s*60\s*\*\s*1000/)
    expect(match).not.toBeNull()
    const minutes = parseInt(match[1])
    expect(minutes).toBeGreaterThanOrEqual(90)
  })

  test('dispatcher-health.js watchdog uses spawn+detach (not execSync) for heartbeat trigger', () => {
    const source = fs.readFileSync(DISPATCHER_HEALTH_PATH, 'utf8')
    const watchdogSection = source.slice(
      source.indexOf('Heartbeat watchdog'),
      source.indexOf('} catch { /* intentionally swallowed', source.indexOf('Heartbeat watchdog'))
    )
    expect(watchdogSection).toContain('spawn(')
    expect(watchdogSection).toContain('detached: true')
    expect(watchdogSection).toContain('unref()')
    expect(watchdogSection).not.toContain("execSync('node heartbeat-wrapper.js'")
  })

  test('heartbeat-executor.js writes start timestamp before the main try block', () => {
    const source = fs.readFileSync(EXECUTOR_PATH, 'utf8')
    const startTimestampIdx = source.indexOf('// Write start timestamp immediately')
    const mainTryIdx = source.indexOf('    try {\n      // ── Per-project steps')
    expect(startTimestampIdx).toBeGreaterThanOrEqual(0)
    expect(mainTryIdx).toBeGreaterThan(0)
    expect(startTimestampIdx).toBeLessThan(mainTryIdx)
  })

  test('health-loop.js checkStepHealth skips non-leadflow projects (prevents false alarms on genome runtime)', () => {
    const source = fs.readFileSync(HEALTH_LOOP_PATH, 'utf8')
    // Guard must appear inside checkStepHealth, before state file reads
    const fnStart = source.indexOf('async checkStepHealth()')
    expect(fnStart).toBeGreaterThan(0)
    const fnBody = source.slice(fnStart, fnStart + 500)
    expect(fnBody).toContain("project_id !== 'leadflow'")
    expect(fnBody).toContain('return')
  })

  test('health-loop.js Heartbeat maxHours allows for 50-80 min run time (threshold >= 1.5h)', () => {
    const source = fs.readFileSync(HEALTH_LOOP_PATH, 'utf8')
    const match = source.match(/\.activity-state\.json['"]\s*,\s*step:\s*['"]Heartbeat['"][^}]*maxHours:\s*([\d.]+)/)
    expect(match).not.toBeNull()
    const maxHours = parseFloat(match[1])
    expect(maxHours).toBeGreaterThanOrEqual(1.5)
  })
})
