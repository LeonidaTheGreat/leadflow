'use strict'
/**
 * E2E Regression: Loop detected investigation dedup guard
 * Task: ca83b150-4483-4e91-ac5d-6e2f35ece15c
 *
 * Verifies Genome task-store loop detector uses prefix-based investigation
 * cooldown lookup (ilike + loop-detection tag) so title variants don't spawn
 * repeated PM investigation tasks.
 */

const assert = require('assert')
const fs = require('fs')

const TASK_STORE_BASE = '/Users/clawdbot/.openclaw/genome/core/task-store-base.js'

let passed = 0
let failed = 0

function check(name, fn) {
  try {
    fn()
    passed++
    console.log(`  PASS: ${name}`)
  } catch (err) {
    failed++
    console.log(`  FAIL: ${name} — ${err.message}`)
  }
}

function run() {
  console.log('\n=== Loop Detected Investigation Dedup Regression ===\n')

  check('task-store-base.js exists', () => {
    assert.ok(fs.existsSync(TASK_STORE_BASE), `Missing file: ${TASK_STORE_BASE}`)
  })

  const src = fs.readFileSync(TASK_STORE_BASE, 'utf8')

  check('uses ilike prefix query for existing investigations', () => {
    assert.ok(
      src.includes(".ilike('title', `${invPrefix}%`)"),
      'Expected prefix ilike lookup for investigation cooldown'
    )
  })

  check('filters existing investigations by loop-detection tag', () => {
    assert.ok(
      src.includes(".contains('tags', ['loop-detection'])"),
      'Expected tags filter to scope cooldown to loop-detection tasks'
    )
  })

  check('query still enforces 24h cooldown', () => {
    assert.ok(
      src.includes(".gte('created_at', cutoff24h)"),
      'Expected created_at 24h cooldown filter'
    )
  })

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
  if (failed > 0) process.exit(1)
}

run()
