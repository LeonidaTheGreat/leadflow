'use strict'
/**
 * Test Suite: Distribution Loop Fix V2 — TaskStore Dedup
 * Task ID: cef00a78-d17a-4238-956a-a44edffe34d2
 *
 * Verifies fixes in ~/.openclaw/genome/scripts/distribution-collector.js:
 * 1. Dedup guard uses TaskStore (local PG), not raw Supabase client
 * 2. zero_traffic alert suppressed when no analytics source configured
 * 3. findRecentTaskByTitle exists on TaskStore
 */

const assert = require('assert').strict
const fs = require('fs')
const path = require('path')

const GENOME_DIR = path.join(require('os').homedir(), '.openclaw', 'genome')
const COLLECTOR_PATH = path.join(GENOME_DIR, 'scripts', 'distribution-collector.js')
const TASK_STORE_BASE_PATH = path.join(GENOME_DIR, 'core', 'task-store-base.js')

console.log('=== Distribution Loop Fix V2 — TaskStore Dedup ===\n')

let passCount = 0
let failCount = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passCount++
  } catch (err) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   ${err.message}`)
    failCount++
  }
}

const collectorSrc = fs.readFileSync(COLLECTOR_PATH, 'utf8')
const taskStoreSrc = fs.readFileSync(TASK_STORE_BASE_PATH, 'utf8')

// Fix 1: dedup must NOT use raw supabase.from('tasks')
test('DEDUP: raw supabase.from(tasks) removed from distribution-collector.js', () => {
  const matches = collectorSrc.match(/supabase\s*\.from\s*\(\s*['"]tasks['"]/g) || []
  assert.equal(matches.length, 0,
    `Found ${matches.length} raw supabase.from('tasks') call(s) — must be 0`)
})

// Fix 1: dedup must use store.findRecentTaskByTitle
test('DEDUP: store.findRecentTaskByTitle called in createDistributionTasks', () => {
  assert.ok(
    collectorSrc.includes('store.findRecentTaskByTitle'),
    'store.findRecentTaskByTitle must be called for dedup'
  )
})

// Fix 1: TaskStore must expose findRecentTaskByTitle
test('TASKSTORE: findRecentTaskByTitle method defined in task-store-base.js', () => {
  assert.ok(
    taskStoreSrc.includes('async findRecentTaskByTitle'),
    'findRecentTaskByTitle must be defined in TaskStoreBase'
  )
})

// Fix 1: TaskStore method uses local-pg (this.db / this.supabase), not an injected supabase client
test('TASKSTORE: findRecentTaskByTitle queries via this.db or this.supabase', () => {
  const methodMatch = taskStoreSrc.match(/async findRecentTaskByTitle[\s\S]*?^\s{2}\}/m)
  assert.ok(methodMatch, 'findRecentTaskByTitle method body must be present')
  const body = methodMatch[0]
  assert.ok(
    body.includes('this.db') || body.includes('this.supabase'),
    'findRecentTaskByTitle must use this.db or this.supabase (local PG client)'
  )
})

// Fix 2: zero_traffic suppressed when no analytics source
test('ZERO-TRAFFIC: hasAnalyticsSource guard present in distribution-collector.js', () => {
  assert.ok(
    collectorSrc.includes('hasAnalyticsSource'),
    'hasAnalyticsSource must guard the zero_traffic issue'
  )
})

test('ZERO-TRAFFIC: guard checks POSTHOG_API_KEY or VERCEL_ACCESS_TOKEN', () => {
  assert.ok(
    collectorSrc.includes('POSTHOG_API_KEY') && collectorSrc.includes('VERCEL_ACCESS_TOKEN'),
    'hasAnalyticsSource must check POSTHOG_API_KEY and VERCEL_ACCESS_TOKEN'
  )
})

test('ZERO-TRAFFIC: zero_traffic push guarded by hasAnalyticsSource', () => {
  // The line pushing zero_traffic must follow hasAnalyticsSource in source order
  const analyticsSrcIdx = collectorSrc.indexOf('hasAnalyticsSource')
  const zeroTrafficIdx = collectorSrc.indexOf("type: 'zero_traffic'")
  assert.ok(analyticsSrcIdx !== -1, 'hasAnalyticsSource must exist')
  assert.ok(zeroTrafficIdx !== -1, "zero_traffic issue must exist")
  assert.ok(analyticsSrcIdx < zeroTrafficIdx,
    'hasAnalyticsSource declaration must appear before zero_traffic push')
})

// Fix 3: Dedup log includes local PG reference
test('LOGGING: dedup log mentions local PG or TaskStore', () => {
  assert.ok(
    collectorSrc.includes('Dedup check via TaskStore') || collectorSrc.includes('local PG'),
    'Dedup log must reference TaskStore or local PG for observability'
  )
})

console.log('\n=== Test Summary ===')
console.log(`✅ Passed: ${passCount}`)
console.log(`❌ Failed: ${failCount}`)
const total = passCount + failCount
console.log(`📈 Pass Rate: ${((passCount / total) * 100).toFixed(1)}%\n`)

if (failCount > 0) {
  process.exit(1)
}
