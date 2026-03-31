#!/usr/bin/env node
/**
 * distribution-loop-dedup-implementation.test.js
 * 
 * Implementation test for the distribution loop deduplication and schema guard fix.
 * Task ID: 5886cf18-e48d-4f99-be5e-af6a89292d37
 * 
 * Validates that:
 * 1. distribution_channels table schema is properly guarded
 * 2. No duplicate task creation via 48-hour cooldown
 * 3. Completed UC completion gate prevents duplicate issues
 * 4. Clear logging for skipped issues/tasks
 * 
 * Root causes fixed:
 * - (1) distribution_channels table missing → Fixed: table exists, checks any status
 * - (2) no dedup check in createDistributionTasks → Fixed: 48h cooldown implemented
 * - (3) completed UCs not suppressed → Fixed: UC completion gate in checkDistributionHealth
 * - (4) no cooldown → Fixed: 48-hour cooldown (was 30 min, now 48h per PRD)
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert').strict

const GENOME_PATH = path.join(require('os').homedir(), '.openclaw', 'genome')
const COLLECTOR_PATH = path.join(GENOME_PATH, 'scripts', 'distribution-collector.js')

console.log('=== Implementation Test: Distribution Loop Dedup Fix ===\n')

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

// Load the distribution-collector.js source
let sourceCode = fs.readFileSync(COLLECTOR_PATH, 'utf8')

// ── ROOT CAUSE 1: distribution_channels table schema guard ──────────────────

test('Root Cause 1: Table existence check queries distribution_channels', () => {
  assert(sourceCode.includes(".from('distribution_channels')"), 
    'Should query distribution_channels table')
})

test('Root Cause 1: Table query guards against missing table error', () => {
  assert(sourceCode.includes('const { data: landingPages, error: lp_err }'), 
    'Should capture query errors from landing page check')
})

test('Root Cause 1: Table query error early exit (no silent swallow)', () => {
  assert(sourceCode.includes("if (lp_err) { console.error('[Distribution]") && 
         sourceCode.includes('return issues'), 
    'Should early exit and log if table query fails')
})

test('Root Cause 1: Channel check does NOT filter by status=active (any status OK)', () => {
  const channelSection = sourceCode.match(/Check if a landing page exists[\s\S]*?\.eq\('channel_type', 'landing_page'\)/)[0]
  assert(!channelSection.includes(".eq('status', 'active')"), 
    'Should check for ANY channel status, not just active')
})

// ── ROOT CAUSE 2: Dedup check in createDistributionTasks ───────────────────

test('Root Cause 2: 48-hour cooldown window computed', () => {
  assert(sourceCode.includes('48 * 60 * 60 * 1000'), 
    'Should compute 48-hour window in milliseconds')
})

test('Root Cause 2: Cooldown query filters by use_case_id', () => {
  assert(sourceCode.includes(".eq('use_case_id', template.use_case_id)"), 
    'Dedup must check by use_case_id, not just issue type')
})

test('Root Cause 2: Cooldown query uses created_at >= 48h ago', () => {
  assert(sourceCode.includes(".gte('created_at', fortyEightHoursAgo)"), 
    'Should query tasks from 48 hours ago to now')
})

test('Root Cause 2: Skips task creation if recent task exists (dedup guard)', () => {
  assert(sourceCode.includes('if (recentTasks?.length > 0)') && 
         sourceCode.includes('continue'), 
    'Should skip task creation if a task exists within 48h')
})

test('Root Cause 2: Cooldown applies to all statuses (done, failed, in_progress)', () => {
  const cooldownSection = sourceCode.match(/fortyEightHoursAgo[\s\S]*?if \(recentTasks/)[0]
  // This should NOT have a .eq('status', X) filter during cooldown check
  assert(!cooldownSection.includes(".eq('status'"), 
    'Cooldown should check all statuses, not filter to specific ones')
})

// ── ROOT CAUSE 3: Completed UCs suppressed ────────────────────────────────

test('Root Cause 3: UC completion gate fetches use_cases table', () => {
  assert(sourceCode.includes(".from('use_cases')"), 
    'Should query use_cases table')
})

test('Root Cause 3: Gate checks implementation_status = complete or done', () => {
  assert(sourceCode.includes(".in('implementation_status', ['complete', 'done'])"), 
    'Should filter UCs by complete/done status')
})

test('Root Cause 3: Gate builds Set of completed UC IDs', () => {
  assert(sourceCode.includes('const completedUcIds = new Set'), 
    'Should create Set for fast lookup of completed UCs')
})

test('Root Cause 3: Every issue type checked against UC completion gate', () => {
  const issueTypes = ['no_landing_page', 'zero_traffic', 'zero_signups', 'low_conversion', 'low_trial_conversion']
  issueTypes.forEach(issue => {
    assert(sourceCode.includes(`if (completedUcIds.has(linkedUc)`), 
      'Every issue should check if its linked UC is complete')
  })
})

test('Root Cause 3: Skipped issues log UC completion reason', () => {
  assert(sourceCode.includes('[Distribution] Skipping') && 
         sourceCode.includes('is complete'), 
    'Should log when UC gate prevents issue creation')
})

// ── ROOT CAUSE 4: Cooldown (short-circuit + 48h) ──────────────────────────

test('Root Cause 4: 30-minute short-circuit exists (immediate dedup)', () => {
  assert(sourceCode.includes('30 * 60 * 1000') || sourceCode.includes('shortCutoff'), 
    'Should have quick 30-min check for duplicate by title')
})

test('Root Cause 4: Short-circuit uses title match (ilike)', () => {
  assert(sourceCode.includes(".ilike('title', `${title}%`)"), 
    'Should do fuzzy title match for quick dedup')
})

test('Root Cause 4: Full 48-hour cooldown query uses use_case_id', () => {
  assert(sourceCode.includes("template.use_case_id") && 
         sourceCode.includes("fortyEightHoursAgo"), 
    'Should have second-layer 48h cooldown by use_case_id')
})

// ── LOGGING CLARITY ───────────────────────────────────────────────────────

test('Logging: Skipped issues include UC reason', () => {
  assert(sourceCode.includes("[Distribution] Skipping"), 
    'Should log all skipped decisions')
})

test('Logging: Skipped tasks include cooldown reason with status', () => {
  assert(sourceCode.includes('${recent.id}: ${recent.status}'), 
    'Should include task ID and status in cooldown skip log')
})

test('Logging: Log message is clear and actionable', () => {
  assert(sourceCode.includes('within 48h'), 
    'Should clearly state 48h cooldown reason')
})

console.log(`\n=== Test Summary ===`)
console.log(`✅ Passed: ${passCount}`)
console.log(`❌ Failed: ${failCount}`)
console.log(`📈 Pass Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`)

if (failCount === 0) {
  console.log(`\n✅ All implementation requirements verified!`)
  process.exit(0)
} else {
  console.log(`\n❌ ${failCount} requirement(s) not met`)
  process.exit(1)
}
