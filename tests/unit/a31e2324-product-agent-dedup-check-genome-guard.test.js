'use strict'
/**
 * Regression guard: DEDUP CHECK in genome role-context guards (task a31e2324)
 *
 * Verifies that genome's b0aa1e45-role-context-guards.test.js includes tests
 * for the product agent DEDUP CHECK rule (added by task cc24cf4c, genome commit d51a297).
 *
 * The genome test file must assert:
 *   - PM spawnRole contains "DEDUP CHECK"
 *   - PM spawnRole contains the UC+agent status query
 *   - DEDUP CHECK is NOT injected into dev spawnRole
 *
 * This guard protects against the genome test file regressing to a state where
 * DEDUP CHECK coverage is removed or never added.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const GENOME_TEST_PATH = path.join(
  process.env.HOME,
  'projects/genome/tests/b0aa1e45-role-context-guards.test.js'
)

function testGenomeTestFileExists() {
  console.log('Test 1: genome b0aa1e45-role-context-guards.test.js exists...')
  assert.ok(
    fs.existsSync(GENOME_TEST_PATH),
    `Expected genome test file at ${GENOME_TEST_PATH}`
  )
  console.log('  PASS: genome test file exists')
}

function testGenomeTestCoversProductDedupCheck() {
  console.log('Test 2: genome test file covers PM spawnRole DEDUP CHECK...')
  const src = fs.readFileSync(GENOME_TEST_PATH, 'utf8')
  assert.ok(
    src.includes('DEDUP CHECK'),
    'Expected genome test to assert DEDUP CHECK is in PM spawnRole'
  )
  assert.ok(
    src.includes("status IN ('done','in_progress','ready')"),
    "Expected genome test to assert dedup SQL with status IN ('done','in_progress','ready')"
  )
  console.log("  PASS: genome test covers DEDUP CHECK and status IN ('done','in_progress','ready')")
}

function testGenomeTestAssertsDedupNotInDev() {
  console.log('Test 3: genome test asserts DEDUP CHECK is not injected into dev spawnRole...')
  const src = fs.readFileSync(GENOME_TEST_PATH, 'utf8')
  assert.ok(
    src.includes('DEDUP CHECK not injected into dev') ||
    src.includes('not.toContain') && src.includes('dev'),
    'Expected genome test to assert DEDUP CHECK SQL is not in dev spawnRole'
  )
  console.log('  PASS: genome test guards against DEDUP CHECK leaking into dev role')
}

function runTests() {
  console.log('\nRegression guard: genome DEDUP CHECK coverage for product agent (task a31e2324)\n')

  const tests = [
    testGenomeTestFileExists,
    testGenomeTestCoversProductDedupCheck,
    testGenomeTestAssertsDedupNotInDev,
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
