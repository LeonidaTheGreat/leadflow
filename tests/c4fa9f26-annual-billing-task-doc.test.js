#!/usr/bin/env node
/**
 * E2E Test: Annual Billing Task Document Validation
 * UC: feat-annual-billing-plan
 * Task: Improve — uc_no_tasks
 */
const fs = require('fs')
const path = require('path')
const assert = require('assert').strict

const TASK_FILE = path.join(__dirname, '../agents/dev/TASK-005-uc-annual-billing-plan.md')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`)
    failed++
  }
}

console.log('=== E2E: Annual Billing Task Document ===\n')

test('Task file exists', () => {
  assert.ok(fs.existsSync(TASK_FILE), `Missing: ${TASK_FILE}`)
})

const content = fs.existsSync(TASK_FILE) ? fs.readFileSync(TASK_FILE, 'utf8') : ''

test('UC slug is referenced', () => {
  assert.ok(content.includes('feat-annual-billing-plan'), 'UC slug not found')
})

test('Stripe webhook entrypoint documented', () => {
  assert.ok(content.includes('app/api/stripe/webhook/route.ts'), 'Webhook path missing')
})

test('Stripe lib entrypoint documented', () => {
  assert.ok(content.includes('lib/stripe.ts'), 'lib/stripe.ts path missing')
})

test('Acceptance criteria present', () => {
  assert.ok(content.includes('Acceptance Criteria'), 'No acceptance criteria section')
})

test('Out-of-scope: no GA4 content in task file', () => {
  assert.ok(!content.includes('ga4') && !content.includes('GA4'), 'Task file should not contain GA4 references')
})

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
