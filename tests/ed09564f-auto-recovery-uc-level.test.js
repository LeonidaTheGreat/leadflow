'use strict'

/**
 * Verification tests for task ed09564f:
 * Fix Auto-Recovery Rate metric to use UC-level recovery.
 *
 * Spec:
 *   What:  mission-metric-collector.js _collectGenomeMetrics() Auto-Recovery Rate
 *          now queries use_cases for failed UC IDs and counts completion status,
 *          not task-level retries.
 *
 *   Verify:
 *     - allTasks .select() includes 'use_case_id' (required for UC-level path)
 *     - Code uses 'failedUCIds' (UC-level grouping, not task-level everFailed)
 *     - Code checks implementation_status === 'complete' for UC recovery
 *     - Fallback to task-level when no UC-linked failures
 *
 *   Boundaries: No changes to production service code in routes/ or lib/.
 *               Fix lives in ~/.openclaw/genome/core/mission-metric-collector.js.
 *
 * Note: Tests run against genome's main branch source to be stable regardless of
 * which branch the genome's working tree is currently on.
 */

const assert = require('assert')
const { execSync } = require('child_process')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`)
    console.error(`        ${err.message}`)
    failed++
  }
}

const GENOME_COLLECTOR_PATH = 'core/mission-metric-collector.js'
const GENOME_DIR = '/Users/clawdbot/.openclaw/genome'

let sourceCode
try {
  sourceCode = execSync(
    `git -C ${GENOME_DIR} show main:${GENOME_COLLECTOR_PATH}`,
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
  )
} catch (err) {
  console.error('FATAL: Could not read genome main branch mission-metric-collector.js')
  console.error(err.message)
  process.exit(1)
}

console.log('\n=== Auto-Recovery Rate: UC-level recovery (task ed09564f) ===\n')
console.log('  (verifying genome main:core/mission-metric-collector.js)\n')

test('allTasks select includes use_case_id', () => {
  assert.ok(
    sourceCode.includes("'id, status, retry_count, created_at, updated_at, tags, use_case_id'"),
    "allTasks .select() must include 'use_case_id' — required for UC-level recovery logic"
  )
})

test('Auto-Recovery Rate uses UC-level failedUCIds (not task-level everFailed)', () => {
  assert.ok(
    sourceCode.includes('failedUCIds'),
    "Code must use 'failedUCIds' for UC-level grouping (old code used 'everFailed')"
  )
  assert.ok(
    !sourceCode.includes('const everFailed ='),
    "Old 'everFailed' variable must not exist — it was the task-level implementation"
  )
})

test('filters failed tasks by use_case_id != null for UC-level path', () => {
  assert.ok(
    sourceCode.includes("t.status === 'failed' && t.use_case_id != null"),
    "Must filter failed tasks by use_case_id != null to find UC-linked failures"
  )
})

test('queries use_cases table for failed UC IDs', () => {
  assert.ok(
    sourceCode.includes(".in('id', failedUCIds)"),
    "Must query use_cases with .in('id', failedUCIds) to get UC completion statuses"
  )
})

test("recovery check uses implementation_status === 'complete'", () => {
  assert.ok(
    sourceCode.includes("implementation_status === 'complete'"),
    "Must check implementation_status === 'complete' to count a UC as recovered"
  )
})

test('falls back to task-level when no UC-linked failures exist', () => {
  assert.ok(
    sourceCode.includes('No UC-linked failures') || sourceCode.includes('fall back to task-level'),
    "Must have task-level fallback for cases with no UC-linked failures (orphan/fix tasks)"
  )
})

test('implementation is inside try/catch for non-fatal behavior', () => {
  const tryBlock = sourceCode.indexOf('try {')
  const failedUCIdsPos = sourceCode.indexOf('failedUCIds')
  assert.ok(
    tryBlock < failedUCIdsPos,
    "failedUCIds logic must be inside a try block (non-fatal if query fails)"
  )
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
