'use strict'
/**
 * tests/genome/spawn-timeout-backoff.test.js
 *
 * Regression guard for task 41152bd4: spawn-consumer must NOT cancel a task
 * when a git network timeout causes worktree preparation to fail.
 *
 * Root cause: catch(branchErr) always set status='cancelled', causing a
 * cancel→recreate loop that kept three P1 UCs stuck for 3+ days.
 *
 * Fix applied to genome/core/actuators/spawn-consumer.js:
 *   - isGitNetworkError() detects transient network errors (ETIMEDOUT, ECONNRESET, etc.)
 *   - Network errors set metadata.backoff_until = now+5min and return { defer: true }
 *   - Non-network errors still cancel (unchanged behavior for logic errors)
 *
 * Fix applied to genome/core/actuators/realtime-dispatcher.js:
 *   - applyPollFairness now filters tasks whose metadata.backoff_until is in the future
 *   - Prevents re-polling the same task before the backoff window expires
 */

const fs = require('fs')
const path = require('path')

const GENOME_DIR = '/Users/clawdbot/projects/genome'
const SPAWN_CONSUMER = fs.readFileSync(path.join(GENOME_DIR, 'core/actuators/spawn-consumer.js'), 'utf-8')
const DISPATCHER = fs.readFileSync(path.join(GENOME_DIR, 'core/actuators/realtime-dispatcher.js'), 'utf-8')

describe('spawn-consumer: git network error → backoff (not cancel)', () => {
  test('isGitNetworkError helper exists', () => {
    expect(SPAWN_CONSUMER).toContain('function isGitNetworkError(msg)')
  })

  test('GIT_NETWORK_BACKOFF_MS constant is defined as 5 minutes', () => {
    expect(SPAWN_CONSUMER).toMatch(/GIT_NETWORK_BACKOFF_MS\s*=\s*5\s*\*\s*60\s*\*\s*1000/)
  })

  test('network error path writes backoff_until to metadata', () => {
    expect(SPAWN_CONSUMER).toContain('backoff_until: backoffUntil')
    expect(SPAWN_CONSUMER).toContain('GIT_NETWORK_BACKOFF_MS')
  })

  test('network error path sets status to ready (not cancelled)', () => {
    const catchStart = SPAWN_CONSUMER.indexOf('catch (branchErr)')
    expect(catchStart).toBeGreaterThan(-1)
    // After isGitNetworkError check, the defer path sets status: ready
    const deferPathEnd = SPAWN_CONSUMER.indexOf("return { defer: true }", catchStart)
    const readyInDeferPath = SPAWN_CONSUMER.slice(catchStart, deferPathEnd).includes("status: 'ready'")
    expect(readyInDeferPath).toBe(true)
  })

  test('network error path returns { defer: true } not { abandoned: true }', () => {
    const catchStart = SPAWN_CONSUMER.indexOf('catch (branchErr)')
    expect(catchStart).toBeGreaterThan(-1)
    const deferInCatch = SPAWN_CONSUMER.indexOf("return { defer: true }", catchStart)
    const abandonedInCatch = SPAWN_CONSUMER.indexOf("return { abandoned: true }", catchStart)
    expect(deferInCatch).toBeGreaterThan(-1)
    expect(abandonedInCatch).toBeGreaterThan(-1)
    // network check comes first → defer path before abandoned path
    expect(deferInCatch).toBeLessThan(abandonedInCatch)
  })

  test('non-network errors still cancel with branch-creation-failed error', () => {
    const catchBlock = SPAWN_CONSUMER.slice(
      SPAWN_CONSUMER.indexOf('catch (branchErr)'),
      SPAWN_CONSUMER.indexOf("return { abandoned: true }") + 30
    )
    expect(catchBlock).toContain("status: 'cancelled'")
    expect(catchBlock).toContain('branch-creation-failed:')
  })

  test('GIT_NETWORK_ERROR_PATTERNS includes ETIMEDOUT and ECONNRESET', () => {
    expect(SPAWN_CONSUMER).toContain('/etimedout/i')
    expect(SPAWN_CONSUMER).toContain('/econnreset/i')
  })
})

describe('applyPollFairness: backoff_until filter', () => {
  test('applyPollFairness filters tasks with future backoff_until', () => {
    expect(DISPATCHER).toContain('backoff_until')
    const filterMatch = DISPATCHER.match(/backoff_until[\s\S]{0,120}>.*now/)
    expect(filterMatch).not.toBeNull()
  })

  test('backoff_until filter precedes last_deferred_at filter', () => {
    const fnStart = DISPATCHER.indexOf('function applyPollFairness')
    expect(fnStart).toBeGreaterThan(-1)
    const fnBody = DISPATCHER.slice(fnStart, fnStart + 700)
    const backoffIdx = fnBody.indexOf('backoff_until')
    const deferredIdx = fnBody.indexOf('last_deferred_at')
    expect(backoffIdx).toBeGreaterThan(-1)
    expect(deferredIdx).toBeGreaterThan(-1)
    expect(backoffIdx).toBeLessThan(deferredIdx)
  })

  test('backoff_until check returns false for future timestamps', () => {
    const fnStart = DISPATCHER.indexOf('function applyPollFairness')
    const fnEnd = DISPATCHER.indexOf('\n}', fnStart) + 2
    const fnBody = DISPATCHER.slice(fnStart, fnEnd)
    // Must return false (exclude task) when backoff is in the future
    expect(fnBody).toContain('return false')
    // Must use Date.parse for string ISO timestamps
    expect(fnBody).toContain('Date.parse(backoffUntil)')
  })
})
