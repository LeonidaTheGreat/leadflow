'use strict'
/**
 * QC E2E verification: product-agent dedup rule (PR #1881, task cc24cf4c)
 * Verifies the DEDUP CHECK rule is wired in both genome locations.
 */
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROLE_CONTEXT = path.join(process.env.HOME, 'projects/genome/core/food/role-context.js')
const SOUL_MD = path.join(process.env.HOME, '.openclaw/workspace-product-manager/SOUL.md')

let passed = 0, failed = 0

function check(label, fn) {
  try { fn(); console.log(`  PASS: ${label}`); passed++ }
  catch (e) { console.error(`  FAIL: ${label}\n    ${e.message}`); failed++ }
}

const rc = fs.readFileSync(ROLE_CONTEXT, 'utf8')
const soul = fs.readFileSync(SOUL_MD, 'utf8')

console.log('\nQC E2E: product agent DEDUP CHECK rule\n')

// Verify rule is inside the product spawnRole context (not just anywhere in the file)
check('DEDUP CHECK in product spawnRole context', () => {
  // The DEDUP CHECK rule should appear after the product spawnRole marker
  const productIdx = rc.indexOf("'product'")
  const dedupIdx = rc.indexOf('DEDUP CHECK')
  assert.ok(dedupIdx > productIdx, 'DEDUP CHECK must appear after product spawnRole definition')
})

check('Dedup SQL covers done/in_progress/ready statuses', () => {
  assert.ok(rc.includes("status IN ('done','in_progress','ready')"),
    "SQL must filter on done/in_progress/ready")
})

check('SOUL.md has DEDUP CHECK section', () => {
  assert.ok(soul.includes('## DEDUP CHECK Before Creating Tasks'),
    'SOUL.md must have DEDUP CHECK section header')
})

check('SOUL.md instructs agent to skip duplicate creation', () => {
  assert.ok(soul.includes('do NOT create a new task'),
    'SOUL.md must instruct agent to skip task creation on duplicate')
})

check('Both locations instruct reporting existing task ID', () => {
  assert.ok(rc.includes('existing task ID') || rc.includes('report the existing task ID'),
    'role-context must instruct agent to report existing task ID')
  assert.ok(soul.includes('existing task ID') || soul.includes('Report the existing task ID'),
    'SOUL.md must instruct agent to report existing task ID')
})

const total = passed + failed
console.log(`\n${failed === 0 ? 'All tests passed' : 'Tests FAILED'}: ${passed}/${total}\n`)
process.exit(failed === 0 ? 0 : 1)
