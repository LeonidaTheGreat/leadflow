'use strict'
/**
 * Unit Test: Product agent DEDUP CHECK rule (task cc24cf4c)
 *
 * Bug: Product agent was creating duplicate tasks for UC+agent combinations that
 * already had completed or in-progress tasks, causing 'Archived: duplicate' failures
 * and wasted compute.
 *
 * Fix: Added DEDUP CHECK rule to two locations:
 *   1. genome core/food/role-context.js — product spawnRole (genome commit d51a297)
 *   2. workspace-product-manager/SOUL.md — product agent identity doc
 *
 * The rule requires the agent to query tasks for any existing done/in_progress/ready
 * row for the same UC+agent before creating a new task.
 *
 * These tests verify the rule is present in both locations.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROLE_CONTEXT_PATH = path.join(
  process.env.HOME,
  'projects/genome/core/food/role-context.js'
)

const SOUL_MD_PATH = path.join(
  process.env.HOME,
  '.openclaw/workspace-product-manager/SOUL.md'
)

// Test 1: DEDUP CHECK keyword is present in role-context.js product spawnRole
function testDedupCheckPresentInRoleContext() {
  console.log('Test 1: DEDUP CHECK rule is present in role-context.js product spawnRole...')
  const src = fs.readFileSync(ROLE_CONTEXT_PATH, 'utf8')
  assert.ok(
    src.includes('DEDUP CHECK'),
    'Expected DEDUP CHECK label in role-context.js product spawnRole'
  )
  console.log('  PASS: DEDUP CHECK found in role-context.js')
}

// Test 2: The dedup SQL query is present in role-context.js
function testDedupSqlInRoleContext() {
  console.log('Test 2: Dedup SQL query is present in role-context.js...')
  const src = fs.readFileSync(ROLE_CONTEXT_PATH, 'utf8')
  assert.ok(
    src.includes("status IN ('done','in_progress','ready')"),
    "Expected status IN ('done','in_progress','ready') in role-context.js dedup query"
  )
  console.log("  PASS: dedup SQL with status IN ('done','in_progress','ready') found")
}

// Test 3: DEDUP CHECK rule is present in the product manager SOUL.md
function testDedupCheckPresentInSoulMd() {
  console.log('Test 3: DEDUP CHECK rule is present in workspace-product-manager/SOUL.md...')
  const src = fs.readFileSync(SOUL_MD_PATH, 'utf8')
  assert.ok(
    src.includes('DEDUP CHECK'),
    'Expected DEDUP CHECK section in workspace-product-manager/SOUL.md'
  )
  console.log('  PASS: DEDUP CHECK found in SOUL.md')
}

// Test 4: SOUL.md instructs agent NOT to create a new task when a row is returned
function testSoulMdBlocksDuplicateCreation() {
  console.log('Test 4: SOUL.md instructs agent to skip task creation when duplicate found...')
  const src = fs.readFileSync(SOUL_MD_PATH, 'utf8')
  assert.ok(
    src.includes('do NOT create a new task'),
    'Expected "do NOT create a new task" instruction in SOUL.md'
  )
  console.log('  PASS: SOUL.md has "do NOT create a new task" guard')
}

// Test 5: role-context.js instructs agent to report existing task ID instead of creating new
function testRoleContextReportsExistingTask() {
  console.log('Test 5: role-context.js instructs agent to report existing task ID...')
  const src = fs.readFileSync(ROLE_CONTEXT_PATH, 'utf8')
  assert.ok(
    src.includes('report the existing task ID') || src.includes('existing task ID'),
    'Expected instruction to report existing task ID in role-context.js dedup block'
  )
  console.log('  PASS: role-context.js instructs agent to report existing task ID')
}

// Run all tests
function runTests() {
  console.log('\nProduct agent DEDUP CHECK rule regression tests\n')

  const tests = [
    testDedupCheckPresentInRoleContext,
    testDedupSqlInRoleContext,
    testDedupCheckPresentInSoulMd,
    testSoulMdBlocksDuplicateCreation,
    testRoleContextReportsExistingTask,
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
