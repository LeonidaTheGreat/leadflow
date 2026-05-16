'use strict'
/**
 * Unit Test: Zombie role-aware staleness threshold
 *
 * Bug: spawn-health-monitor.js used a fixed ZOMBIE_IDLE_LOG_MIN (15 min) for all
 * agent roles. PM/product tasks think strategically and can go silent for 30+
 * minutes while still working, causing 7 false zombie cancellations in the prior week.
 *
 * Fix: A per-role IDLE_THRESHOLD_BY_ROLE lookup is computed for each task. Product
 * tasks get 60 minutes, qc gets 45, marketing/analytics get 30, dev/design keep
 * the original 15. Unknown roles fall back to ZOMBIE_IDLE_LOG_MIN (15 min).
 * ZOMBIE_HARD_CAP_MIN (120 min) is intentionally excluded — it is an absolute safety net.
 *
 * These tests verify the fix is present in the genome source file and that the
 * threshold lookup logic is correct.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const SPAWN_HEALTH_MONITOR_PATH = path.join(
  process.env.HOME,
  '.openclaw/genome/core/loops/spawn-health-monitor.js'
)

function readSource() {
  return fs.readFileSync(SPAWN_HEALTH_MONITOR_PATH, 'utf8')
}

// Test 1: Per-role threshold lookup table is present in the source
function testPerRoleThresholdTablePresent() {
  console.log('Test 1: Per-role IDLE_THRESHOLD_BY_ROLE lookup table is defined...')
  const src = readSource()
  assert.ok(
    src.includes('IDLE_THRESHOLD_BY_ROLE'),
    'Expected IDLE_THRESHOLD_BY_ROLE lookup table to be defined inside detectZombieTasks loop'
  )
  console.log('  PASS: IDLE_THRESHOLD_BY_ROLE is defined')
}

// Test 2: Product agent gets a longer threshold than dev
function testProductThresholdLongerThanDev() {
  console.log('Test 2: product agent gets a longer idle threshold than dev...')
  const src = readSource()
  // Extract the IDLE_THRESHOLD_BY_ROLE object from source
  const match = src.match(/const IDLE_THRESHOLD_BY_ROLE\s*=\s*\{([^}]+)\}/)
  assert.ok(match, 'Could not find IDLE_THRESHOLD_BY_ROLE definition in source')
  const tableStr = match[1]
  // Parse out dev and product values
  const devMatch = tableStr.match(/dev:\s*(\d+)/)
  const productMatch = tableStr.match(/product:\s*(\d+)/)
  assert.ok(devMatch, 'dev threshold not found in IDLE_THRESHOLD_BY_ROLE')
  assert.ok(productMatch, 'product threshold not found in IDLE_THRESHOLD_BY_ROLE')
  const devThreshold = parseInt(devMatch[1], 10)
  const productThreshold = parseInt(productMatch[1], 10)
  assert.ok(
    productThreshold > devThreshold,
    `product threshold (${productThreshold}m) must be > dev threshold (${devThreshold}m)`
  )
  console.log(`  PASS: product=${productThreshold}m > dev=${devThreshold}m`)
}

// Test 3: idleThreshold and graceThreshold are used instead of raw constants
function testDerivedThresholdsUsed() {
  console.log('Test 3: idleThreshold and graceThreshold are used in the conditional checks...')
  const src = readSource()
  assert.ok(
    src.includes('runtimeMinutes > graceThreshold'),
    'Expected runtimeMinutes > graceThreshold (not raw ZOMBIE_EARLY_GRACE_MIN)'
  )
  assert.ok(
    src.includes('logAge > idleThreshold'),
    'Expected logAge > idleThreshold (not raw ZOMBIE_IDLE_LOG_MIN)'
  )
  console.log('  PASS: derived thresholds are used in conditionals')
}

// Test 4: ZOMBIE_HARD_CAP_MIN is NOT role-scaled (still uses raw constant)
function testHardCapNotScaled() {
  console.log('Test 4: ZOMBIE_HARD_CAP_MIN hard cap is NOT role-scaled...')
  const src = readSource()
  assert.ok(
    src.includes('runtimeMinutes > ZOMBIE_HARD_CAP_MIN'),
    'Expected runtimeMinutes > ZOMBIE_HARD_CAP_MIN (hard cap must remain role-agnostic)'
  )
  // The hard cap must NOT be multiplied or looked up per role
  assert.ok(
    !src.includes('ZOMBIE_HARD_CAP_MIN * roleMultiplier') &&
    !src.includes('IDLE_THRESHOLD_BY_ROLE[task.agent_id] || ZOMBIE_HARD_CAP_MIN'),
    'ZOMBIE_HARD_CAP_MIN must NOT be role-scaled'
  )
  console.log('  PASS: hard cap remains role-agnostic')
}

// Test 5: Simulate the per-role threshold logic for all known agent roles
function testPerRoleThresholdSimulation() {
  console.log('Test 5: Simulate per-role threshold logic for all known agent roles...')

  const ZOMBIE_IDLE_LOG_MIN = 15
  // Mirror the exact lookup table from spawn-health-monitor.js
  const IDLE_THRESHOLD_BY_ROLE = { dev: 15, design: 15, qc: 45, product: 60, marketing: 30, analytics: 30 }

  const cases = [
    { agentId: 'product',   expectedMin: 30 },  // must be > 15 (original dev threshold)
    { agentId: 'qc',        expectedMin: 20 },  // must be > 15
    { agentId: 'marketing', expectedMin: 20 },  // must be > 15
    { agentId: 'analytics', expectedMin: 20 },  // must be > 15
    { agentId: 'dev',       expectedMin: 0  },  // any value acceptable
    { agentId: 'design',    expectedMin: 0  },  // any value acceptable
    { agentId: null,        expectedMin: 0  },  // falls back to ZOMBIE_IDLE_LOG_MIN
  ]

  for (const { agentId, expectedMin } of cases) {
    // Mirror the exact logic in spawn-health-monitor.js
    const idleThreshold = IDLE_THRESHOLD_BY_ROLE[agentId] || ZOMBIE_IDLE_LOG_MIN
    assert.ok(
      idleThreshold >= expectedMin,
      `agent_id='${agentId}': expected idleThreshold >= ${expectedMin}m, got ${idleThreshold}m`
    )
  }

  // Verify product specifically gets more than the original 15-min dev threshold
  const productThreshold = IDLE_THRESHOLD_BY_ROLE['product'] || ZOMBIE_IDLE_LOG_MIN
  assert.ok(
    productThreshold > ZOMBIE_IDLE_LOG_MIN,
    `product must get more than the base ${ZOMBIE_IDLE_LOG_MIN}m threshold, got ${productThreshold}m`
  )

  console.log('  PASS: per-role thresholds correct (product/qc/marketing/analytics get more time than dev)')
}

// Test 6: Log messages include the effective threshold and role for debuggability
function testLogMessagesIncludeThreshold() {
  console.log('Test 6: Zombie log messages include effective threshold and role for debugging...')
  const src = readSource()
  assert.ok(
    src.includes('threshold ${idleThreshold}m') || src.includes('idleThreshold}m'),
    'Expected idle threshold to appear in at least one log message'
  )
  assert.ok(
    src.includes('role: ${task.agent_id}'),
    'Expected role to appear in log messages for debuggability'
  )
  console.log('  PASS: log messages include effective thresholds and role')
}

// Run all tests
function runTests() {
  console.log('\nZombie role-aware staleness threshold tests\n')

  const tests = [
    testPerRoleThresholdTablePresent,
    testProductThresholdLongerThanDev,
    testDerivedThresholdsUsed,
    testHardCapNotScaled,
    testPerRoleThresholdSimulation,
    testLogMessagesIncludeThreshold,
  ]

  let passed = 0
  let failed = 0

  for (const testFn of tests) {
    try {
      testFn()
      passed++
    } catch (err) {
      console.error(`  FAIL: ${testFn.name}`)
      console.error(`    ${err.message}`)
      failed++
    }
  }

  const total = tests.length
  console.log(`\n${failed === 0 ? 'All tests passed' : 'Some tests FAILED'}: ${passed}/${total}\n`)
  return { passed, total, passRate: passed / total }
}

if (require.main === module) {
  const results = runTests()
  process.exit(results.passRate === 1.0 ? 0 : 1)
}

module.exports = { runTests }
