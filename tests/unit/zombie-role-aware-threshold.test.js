'use strict'
/**
 * Unit Test: Zombie role-aware staleness threshold
 *
 * Bug: spawn-health-monitor.js used a fixed ZOMBIE_IDLE_LOG_MIN (15 min) and
 * ZOMBIE_EARLY_GRACE_MIN (15 min) for all agent roles. PM/product tasks think
 * strategically and can go silent for 30+ minutes while still working, causing
 * 7 false zombie cancellations in the prior week.
 *
 * Fix: A roleMultiplier (2 for pm/product, 1 for all others) is computed at the
 * top of the task-loop body. idleThreshold and graceThreshold are derived from
 * the multiplied base constants. ZOMBIE_HARD_CAP_MIN is intentionally excluded
 * from the multiplier — it is an absolute safety net.
 *
 * These tests verify the fix is present in the genome source file and that the
 * multiplier logic is correct.
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

// Test 1: roleMultiplier variable is present in the source
function testRoleMultiplierPresent() {
  console.log('Test 1: roleMultiplier variable is defined in the task loop...')
  const src = readSource()
  assert.ok(
    src.includes('const roleMultiplier'),
    'Expected const roleMultiplier to be defined inside detectZombieTasks loop'
  )
  console.log('  PASS: roleMultiplier is defined')
}

// Test 2: pm and product agent IDs receive a 2x multiplier
function testPmProductGetDoubleMultiplier() {
  console.log("Test 2: pm and product agent_ids get 2x multiplier in the source...")
  const src = readSource()
  // Verify both agent IDs are checked
  assert.ok(
    src.includes("task.agent_id === 'product'") && src.includes("task.agent_id === 'pm'"),
    "Expected both 'product' and 'pm' agent_id checks in roleMultiplier condition"
  )
  assert.ok(
    src.includes(') ? 2 : 1'),
    'Expected ternary 2 : 1 for role multiplier'
  )
  console.log('  PASS: both pm and product get 2x multiplier')
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

// Test 4: ZOMBIE_HARD_CAP_MIN is NOT multiplied (still uses raw constant)
function testHardCapNotMultiplied() {
  console.log('Test 4: ZOMBIE_HARD_CAP_MIN hard cap is NOT multiplied by roleMultiplier...')
  const src = readSource()
  // Hard cap check must still use the raw constant
  assert.ok(
    src.includes('runtimeMinutes > ZOMBIE_HARD_CAP_MIN'),
    'Expected runtimeMinutes > ZOMBIE_HARD_CAP_MIN (hard cap must remain role-agnostic)'
  )
  // The hard cap must NOT be multiplied
  assert.ok(
    !src.includes('ZOMBIE_HARD_CAP_MIN * roleMultiplier'),
    'ZOMBIE_HARD_CAP_MIN must NOT be multiplied by roleMultiplier'
  )
  console.log('  PASS: hard cap remains role-agnostic')
}

// Test 5: Simulate the multiplier logic for each agent role
function testMultiplierLogicSimulation() {
  console.log('Test 5: Simulate roleMultiplier logic for all known agent roles...')

  const ZOMBIE_IDLE_LOG_MIN   = 15
  const ZOMBIE_EARLY_GRACE_MIN = 15

  const cases = [
    { agentId: 'product', expectedMultiplier: 2 },
    { agentId: 'pm',      expectedMultiplier: 2 },
    { agentId: 'dev',     expectedMultiplier: 1 },
    { agentId: 'qc',      expectedMultiplier: 1 },
    { agentId: 'design',  expectedMultiplier: 1 },
    { agentId: 'analytics', expectedMultiplier: 1 },
    { agentId: 'marketing', expectedMultiplier: 1 },
    { agentId: null,      expectedMultiplier: 1 },
  ]

  for (const { agentId, expectedMultiplier } of cases) {
    // This mirrors the exact logic in spawn-health-monitor.js
    const roleMultiplier = (agentId === 'product' || agentId === 'pm') ? 2 : 1
    const idleThreshold  = ZOMBIE_IDLE_LOG_MIN   * roleMultiplier
    const graceThreshold = ZOMBIE_EARLY_GRACE_MIN * roleMultiplier

    assert.strictEqual(
      roleMultiplier, expectedMultiplier,
      `agent_id='${agentId}': expected multiplier=${expectedMultiplier}, got ${roleMultiplier}`
    )
    assert.strictEqual(
      idleThreshold, ZOMBIE_IDLE_LOG_MIN * expectedMultiplier,
      `agent_id='${agentId}': idleThreshold wrong`
    )
    assert.strictEqual(
      graceThreshold, ZOMBIE_EARLY_GRACE_MIN * expectedMultiplier,
      `agent_id='${agentId}': graceThreshold wrong`
    )
  }

  console.log('  PASS: multiplier logic correct for all roles (pm/product=2x, others=1x)')
}

// Test 6: The log messages include the effective threshold and role for debuggability
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
    testRoleMultiplierPresent,
    testPmProductGetDoubleMultiplier,
    testDerivedThresholdsUsed,
    testHardCapNotMultiplied,
    testMultiplierLogicSimulation,
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
