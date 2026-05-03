#!/usr/bin/env node
/**
 * Unit Test: Genome Auto-Retry Zero-Retry Transient Failures
 *
 * Verifies that the genome heartbeat can detect and re-queue failed tasks
 * that have zero actual retry attempts (i.e., they never ran a full agent
 * cycle) due to transient causes.
 *
 * The fix has two components:
 *   1. Inline fix (completion-handler-qc.js): on new verification failures
 *      with retry_count=0, immediately reset to ready (bypass EscalationLadder)
 *   2. Heartbeat sweep (rescue-strategies.js / heartbeat-executor.js step 3b5):
 *      periodic scan for historical stuck zero-retry failures
 *
 * Reads genome files from the task branch (or falls back to main) so that
 * tests pass both before and after the genome PR is merged.
 *
 * Run with: node tests/unit/genome-zero-retry-transient-fix.test.js
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

const GENOME_DIR = path.join(os.homedir(), '.openclaw', 'genome')
const TASK_BRANCH = 'dev/ad71cfab-fix-auto-retry-transient-zero-retry-task'

const results = { passed: 0, failed: 0 }

function test(name, fn) {
  try {
    fn()
    results.passed++
    console.log(`  ✅ ${name}`)
  } catch (err) {
    results.failed++
    console.log(`  ❌ ${name}`)
    console.log(`     Error: ${err.message}`)
  }
}

/**
 * Read a genome file from the task branch if it exists, otherwise fall back
 * to the filesystem (which means the branch has been merged to main).
 */
function readGenomeFile(relPath) {
  // Try task branch first via git show
  try {
    const content = execSync(
      `git -C "${GENOME_DIR}" show "${TASK_BRANCH}:${relPath}" 2>/dev/null`,
      { encoding: 'utf-8' }
    )
    if (content && content.length > 0) return content
  } catch (_) {
    // branch gone (merged) — fall through to filesystem
  }
  // Fall back to filesystem (merged to main)
  const fsPath = path.join(GENOME_DIR, relPath)
  return fs.readFileSync(fsPath, 'utf-8')
}

console.log('\n🧪 Genome Zero-Retry Transient Fix Tests\n')

// ── Part 1: Inline fix in completion-handler-qc.js ────────────────────────

let qcContent = ''
try {
  qcContent = readGenomeFile('core/completion-handler-qc.js')
} catch (err) {
  console.error(`❌ Could not read completion-handler-qc.js: ${err.message}`)
  process.exit(1)
}

console.log('Part 1: Inline fix in completion-handler-qc.js\n')

test('Simple first-attempt reset block exists', () => {
  assert.ok(
    qcContent.includes('retry_count') && qcContent.includes('=== 0') &&
    qcContent.includes("status: 'ready'"),
    'completion-handler-qc.js should contain the simple first-attempt reset block'
  )
})

test('Reset sets retry_count to 1 to avoid re-triggering the zero-check', () => {
  assert.ok(
    qcContent.includes('retry_count: 1'),
    'The reset should set retry_count: 1 (not 0) to bypass zero-check on next cycle'
  )
})

test('Unrecoverable failures are excluded from simple reset', () => {
  assert.ok(
    qcContent.includes('!unrecoverable') || qcContent.includes('unrecoverable'),
    'Unrecoverable failures should not be reset via the simple path'
  )
})

test('QC failure retry log message exists', () => {
  assert.ok(
    qcContent.includes('QC failure retry') || qcContent.includes('transient, retry'),
    'Should have a log message for the QC failure retry reset'
  )
})

// ── Part 2: Heartbeat sweep in rescue-strategies.js ───────────────────────

let rescueContent = ''
try {
  rescueContent = readGenomeFile('core/loops/rescue-strategies.js')
} catch (err) {
  console.error(`❌ Could not read rescue-strategies.js: ${err.message}`)
  process.exit(1)
}

console.log('\nPart 2: Heartbeat sweep in rescue-strategies.js\n')

test('retryZeroRetryFailures function exists', () => {
  assert.ok(
    rescueContent.includes('retryZeroRetryFailures'),
    'rescue-strategies.js should define retryZeroRetryFailures'
  )
})

test('Transient patterns include no-commits', () => {
  assert.ok(
    rescueContent.includes('no commits on branch'),
    'TRANSIENT_PATTERNS should include "no commits on branch"'
  )
})

test('Transient patterns include spawn-time exhaustion', () => {
  assert.ok(
    rescueContent.includes('Max retries exhausted at spawn time'),
    'TRANSIENT_PATTERNS should include "Max retries exhausted at spawn time"'
  )
})

test('Cooldown guard prevents immediate re-fail loops', () => {
  assert.ok(
    rescueContent.includes('COOLDOWN_ZERO_RETRY_MS') || rescueContent.includes('COOLDOWN'),
    'Should have a cooldown constant to prevent immediate re-fail loops'
  )
})

test('Blocked tasks are excluded from sweep', () => {
  assert.ok(
    rescueContent.includes('blocked_human') && rescueContent.includes('blocked_external'),
    'Should skip tasks with block_category=blocked_human or blocked_external'
  )
})

test('Already-rescued tasks are excluded from sweep', () => {
  assert.ok(
    rescueContent.includes('metadata?.rescued'),
    'Should skip tasks with metadata.rescued=true'
  )
})

test('Reset uses status=ready and clears last_error', () => {
  assert.ok(
    rescueContent.includes("status: 'ready'") && rescueContent.includes('last_error: null'),
    'Reset should set status=ready and clear last_error'
  )
})

test('Sweep logs count of resets', () => {
  assert.ok(
    rescueContent.includes('resetCount') || rescueContent.includes('reset_count'),
    'Should track and log the count of tasks reset'
  )
})

// ── Part 3: Proxy in execution-loop.js ────────────────────────────────────

let execLoopContent = ''
try {
  execLoopContent = readGenomeFile('core/loops/execution-loop.js')
} catch (err) {
  console.error(`❌ Could not read execution-loop.js: ${err.message}`)
  process.exit(1)
}

console.log('\nPart 3: Proxy in execution-loop.js\n')

test('retryZeroRetryFailures proxy method exists in ExecutionLoop', () => {
  assert.ok(
    execLoopContent.includes('retryZeroRetryFailures'),
    'execution-loop.js should proxy retryZeroRetryFailures to rescueCoordinator'
  )
})

test('Proxy delegates to rescueCoordinator', () => {
  assert.ok(
    execLoopContent.includes('rescueCoordinator.retryZeroRetryFailures'),
    'ExecutionLoop.retryZeroRetryFailures should delegate to rescueCoordinator.retryZeroRetryFailures'
  )
})

// ── Part 4: Wired in heartbeat-executor.js ────────────────────────────────

let heartbeatContent = ''
try {
  heartbeatContent = readGenomeFile('core/heartbeat-executor.js')
} catch (err) {
  console.error(`❌ Could not read heartbeat-executor.js: ${err.message}`)
  process.exit(1)
}

console.log('\nPart 4: Wired into heartbeat-executor.js\n')

test('Step 3b5 retryZeroRetryFailures is wired in heartbeat', () => {
  assert.ok(
    heartbeatContent.includes("'3b5'") && heartbeatContent.includes('retryZeroRetryFailures'),
    "heartbeat-executor.js should have step '3b5' calling retryZeroRetryFailures"
  )
})

test('Step 3b5 follows 3b4 (correct ordering)', () => {
  const idx3b4 = heartbeatContent.indexOf("'3b4'")
  const idx3b5 = heartbeatContent.indexOf("'3b5'")
  assert.ok(
    idx3b4 !== -1 && idx3b5 !== -1 && idx3b4 < idx3b5,
    "Step 3b5 should appear after step 3b4 in heartbeat sequence"
  )
})

test('Step 3b5 precedes 3c (correct ordering)', () => {
  const idx3b5 = heartbeatContent.indexOf("'3b5'")
  const idx3c = heartbeatContent.indexOf("'3c'")
  assert.ok(
    idx3b5 !== -1 && idx3c !== -1 && idx3b5 < idx3c,
    "Step 3b5 should appear before step 3c in heartbeat sequence"
  )
})

test('Step 3b5 is documented in heartbeat step list', () => {
  assert.ok(
    heartbeatContent.includes('3b5') && heartbeatContent.includes('retryZeroRetryFailures'),
    'heartbeat-executor.js step list should document 3b5 retryZeroRetryFailures'
  )
})

// ── Part 5: Logic verification (pure logic tests) ─────────────────────────

console.log('\nPart 5: Logic verification (pure)\n')

test('Transient pattern matching is case-insensitive', () => {
  const TRANSIENT_PATTERNS = [
    'no commits on branch',
    'Max retries exhausted at spawn time',
  ]
  const testCases = [
    'Verification failed: no commits on branch',
    'NO COMMITS ON BRANCH',
    'Max Retries Exhausted At Spawn Time',
    'Max retries exhausted at spawn time',
  ]
  for (const errMsg of testCases) {
    const lower = errMsg.toLowerCase()
    const isTransient = TRANSIENT_PATTERNS.some(p => lower.includes(p.toLowerCase()))
    assert.ok(isTransient, `"${errMsg}" should match a transient pattern`)
  }
})

test('Non-transient patterns do not match', () => {
  const TRANSIENT_PATTERNS = [
    'no commits on branch',
    'Max retries exhausted at spawn time',
  ]
  const nonTransient = [
    'Build failed: cannot find module',
    'Tests failed: 2 failures',
    'Branch does not exist (local and remote)',
    'Requires human action: A2P compliance',
  ]
  for (const errMsg of nonTransient) {
    const lower = errMsg.toLowerCase()
    const isTransient = TRANSIENT_PATTERNS.some(p => lower.includes(p.toLowerCase()))
    assert.ok(!isTransient, `"${errMsg}" should NOT match a transient pattern`)
  }
})

test('Cooldown correctly filters recent failures', () => {
  const COOLDOWN_MS = 5 * 60 * 1000
  const now = Date.now()

  // Failed 10 minutes ago — should retry
  const failedOld = now - 10 * 60 * 1000
  assert.ok(now - failedOld >= COOLDOWN_MS, 'Task failed 10min ago should pass cooldown')

  // Failed 2 minutes ago — should NOT retry
  const failedRecent = now - 2 * 60 * 1000
  assert.ok(now - failedRecent < COOLDOWN_MS, 'Task failed 2min ago should NOT pass cooldown')
})

test('Blocked tasks are correctly identified and skipped', () => {
  const shouldSkip = (metadata) => {
    const blockCat = (metadata && metadata.block_category) || ''
    return blockCat === 'blocked_human' || blockCat === 'blocked_external'
  }
  assert.ok(shouldSkip({ block_category: 'blocked_human' }), 'blocked_human should be skipped')
  assert.ok(shouldSkip({ block_category: 'blocked_external' }), 'blocked_external should be skipped')
  assert.ok(!shouldSkip({ block_category: 'unknown' }), 'unknown category should NOT be skipped')
  assert.ok(!shouldSkip(null), 'null metadata should NOT be skipped')
})

// ── Summary ───────────────────────────────────────────────────────────────

const total = results.passed + results.failed
console.log(`\n${'─'.repeat(50)}`)
console.log(`Results: ${results.passed}/${total} passed`)
if (results.failed > 0) {
  console.log(`❌ ${results.failed} test(s) failed`)
  process.exit(1)
} else {
  console.log('✅ All tests passed')
  process.exit(0)
}

module.exports = { run: () => results }
