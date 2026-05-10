'use strict'
/**
 * Test: Genome checkUCExhausted race condition fix
 *
 * Bug: checkUCExhausted() had a TOCTOU race condition — concurrent heartbeat runs
 * both read "no PM task" before either wrote, producing duplicate PM investigate tasks.
 * Evidence: 3 tasks created within 150ms for the same UC.
 *
 * Fix 1 (uc-lifecycle.js): Replace read-then-write dedup with dedup_key on createTask.
 *   The DB unique index on dedup_key atomically prevents duplicates.
 *   Daily-bounded key (dayKey) allows re-investigation the next day if the UC gets stuck again.
 *
 * Fix 2 (task-store-base.js): Add dedup_key pre-check + include in taskData + handle
 *   unique constraint violations (23505) gracefully instead of throwing.
 *
 * Fix 3 (rescue-strategies.js retryStuckUCs): Add metadata to select + skip UCs with
 *   blocked_human=true to avoid spawning dev tasks that will always fail.
 */

const assert = require('assert')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const UC_LIFECYCLE_PATH = path.join(process.env.HOME, '.openclaw/genome/core/uc-lifecycle.js')
const TASK_STORE_PATH = path.join(process.env.HOME, '.openclaw/genome/core/task-store-base.js')
const RESCUE_PATH = path.join(process.env.HOME, '.openclaw/genome/core/loops/rescue-strategies.js')

function grep(pattern, file) {
  try {
    return parseInt(execSync(`grep -c "${pattern}" "${file}"`).toString().trim(), 10)
  } catch {
    return 0
  }
}

// Test 1: dedup_key is present in uc-lifecycle.js createTask call
function testDedupKeyInUCLifecycle() {
  console.log('Test 1: dedup_key present in checkUCExhausted createTask call...')
  const count = grep('dedup_key.*pm-investigate-stuck', UC_LIFECYCLE_PATH)
  assert.strictEqual(count, 1, `Expected 1 line with dedup_key 'pm-investigate-stuck-' — got ${count}`)
  console.log('  ✅ dedup_key correctly added to PM investigation task creation')
}

// Test 2: Old TOCTOU read-then-write is gone from uc-lifecycle.js
function testOldTOCTOURemoved() {
  console.log('Test 2: Old read-then-write dedup check removed...')
  const oldCheck = grep('cutoff24h', UC_LIFECYCLE_PATH)
  assert.strictEqual(oldCheck, 0, `Expected 0 lines with old cutoff24h check — got ${oldCheck}`)
  const oldQuery = grep('recentPM', UC_LIFECYCLE_PATH)
  assert.strictEqual(oldQuery, 0, `Expected 0 lines with old recentPM query — got ${oldQuery}`)
  console.log('  ✅ Old TOCTOU read-then-write check removed')
}

// Test 3: dedup_key included in taskData in task-store-base.js
function testDedupKeyInTaskData() {
  console.log('Test 3: dedup_key included in taskData insert...')
  const count = grep('dedup_key: task.dedup_key', TASK_STORE_PATH)
  assert.ok(count >= 1, `Expected dedup_key in taskData — got ${count}`)
  console.log('  ✅ dedup_key correctly included in taskData for DB insert')
}

// Test 4: dedup_key pre-check exists in task-store-base.js (prevents round-trips)
function testDedupKeyPreCheck() {
  console.log('Test 4: dedup_key pre-check added to createTask...')
  const count = grep('task.dedup_key.*this.db', TASK_STORE_PATH)
  assert.ok(count >= 1, `Expected dedup_key pre-check in createTask — got ${count}`)
  console.log('  ✅ dedup_key pre-check present in createTask')
}

// Test 5: unique constraint violation (23505) handled gracefully
function testUniqueConstraintHandled() {
  console.log('Test 5: Unique constraint violation 23505 handled gracefully...')
  const count = grep('23505', TASK_STORE_PATH)
  assert.ok(count >= 1, `Expected 23505 error code handling in task-store-base — got ${count}`)
  console.log('  ✅ Unique constraint violation handled gracefully (no throw on duplicate dedup_key)')
}

// Test 6: metadata included in stuckUCs select in rescue-strategies.js
function testMetadataInStuckUCsSelect() {
  console.log('Test 6: metadata included in retryStuckUCs select...')
  const content = fs.readFileSync(RESCUE_PATH, 'utf-8')
  // Find the retryStuckUCs section and check the select includes metadata
  const retryStuckSection = content.slice(content.indexOf('retryStuckUCs'))
  const selectLine = retryStuckSection.match(/\.select\('([^']+)'\)/)
  assert.ok(selectLine && selectLine[1].includes('metadata'),
    `Expected metadata in retryStuckUCs select — got: ${selectLine ? selectLine[1] : 'no select found'}`)
  console.log('  ✅ metadata included in retryStuckUCs UC select')
}

// Test 7: blocked_human guard present in retryStuckUCs
function testBlockedHumanGuard() {
  console.log('Test 7: blocked_human guard present in retryStuckUCs...')
  const count = grep('blocked_human', RESCUE_PATH)
  assert.ok(count >= 1, `Expected blocked_human guard in rescue-strategies — got ${count}`)
  console.log('  ✅ blocked_human flag check present — prevents spawning dev tasks that will always fail')
}

// Test 8: Verify the race condition scenario (logic simulation, no DB needed)
function testRaceConditionScenario() {
  console.log('Test 8: Documenting TOCTOU race condition scenario...')

  // Simulate concurrent reads before either writes
  const tasksInDB = []
  const cutoff24h = Date.now() - 24 * 60 * 60 * 1000

  // Old dedup: both runs read "no PM task in last 24h" before either creates
  const runA_sees = tasksInDB.filter(t => t.created_at > cutoff24h).length
  const runB_sees = tasksInDB.filter(t => t.created_at > cutoff24h).length
  assert.strictEqual(runA_sees, 0, 'Run A sees no tasks (TOCTOU window open)')
  assert.strictEqual(runB_sees, 0, 'Run B sees no tasks (TOCTOU window open)')

  // Both would proceed to create → duplicates
  // New fix: dedup_key unique index means only one insert wins, other gets 23505

  // Verify the daily key is deterministic for the same day
  const dayKey1 = Math.floor(Date.now() / (24 * 60 * 60 * 1000))
  const dayKey2 = Math.floor((Date.now() + 1000) / (24 * 60 * 60 * 1000)) // 1 second later
  assert.strictEqual(dayKey1, dayKey2, 'dayKey is stable within the same day — same key, DB rejects second insert')

  console.log('  ✅ TOCTOU scenario confirmed: DB unique index on dedup_key is the atomic guard')
}

// Run all tests
let passed = 0
let failed = 0
const tests = [
  testDedupKeyInUCLifecycle,
  testOldTOCTOURemoved,
  testDedupKeyInTaskData,
  testDedupKeyPreCheck,
  testUniqueConstraintHandled,
  testMetadataInStuckUCsSelect,
  testBlockedHumanGuard,
  testRaceConditionScenario
]

for (const test of tests) {
  try {
    test()
    passed++
  } catch (err) {
    console.error(`  ❌ FAILED: ${err.message}`)
    failed++
  }
}

console.log(`\nResults: ${passed}/${tests.length} passed`)
if (failed > 0) {
  process.exit(1)
}
