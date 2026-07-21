'use strict'
/**
 * E2E Regression Test: 0d86f6fc — PR creation exhaustion is silent
 *
 * Root cause: CompletionScanner.run() in genome/core/sensors/completion-scan.js
 * called failTask() when PR creation exhausted 8 attempts but never called
 * this.sendTelegram(). Fix applied in genome at commit 28a855ff.
 *
 * This test verifies the fix exists in the live genome checkout, the genome
 * regression test covers the alert, and the verification doc is present.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`)
    failed++
  }
}

console.log('\n=== Regression Test: 0d86f6fc PR creation exhaustion alert ===\n')

const GENOME_SCAN = path.join('/Users/clawdbot/projects/genome/core/sensors/completion-scan.js')
const GENOME_TEST = path.join('/Users/clawdbot/projects/genome/tests/completion-scan-pr-creation-retry.test.js')
const VERIFY_DOC  = path.join(__dirname, '..', 'docs', 'GENOME-DEV-COMMIT-VERIFICATION-0d86f6fc.md')

// ── Genome fix ─────────────────────────────────────────────────────────────

const scanSrc = fs.readFileSync(GENOME_SCAN, 'utf8')

test('genome completion-scan has Telegram alert on PR exhaustion path', () => {
  assert.ok(
    scanSrc.includes('PR creation exhausted') && scanSrc.includes('sendTelegram'),
    'genome/core/sensors/completion-scan.js must call sendTelegram when PR creation is exhausted'
  )
})

test('genome completion-scan alert is inside try-catch (non-fatal)', () => {
  // Alert must be in a try block so a failed Telegram send never blocks failTask.
  // Find the sendTelegram call near the exhaustion path and scan ±600 chars for try/catch.
  const sendTgIdx = scanSrc.indexOf('this.sendTelegram(tgMsg)')
  assert.ok(sendTgIdx > -1, 'this.sendTelegram(tgMsg) call not found in completion-scan.js')
  const window = scanSrc.slice(Math.max(0, sendTgIdx - 600), sendTgIdx + 400)
  assert.ok(
    window.includes('try') && window.includes('catch'),
    'sendTelegram call must be wrapped in try-catch to keep it non-fatal'
  )
})

test('genome completion-scan calls failTask after the Telegram alert', () => {
  const exhaustionIdx = scanSrc.indexOf('PR creation exhausted')
  const alertIdx      = scanSrc.indexOf('sendTelegram', exhaustionIdx)
  const failIdx       = scanSrc.indexOf('failTask', alertIdx)
  assert.ok(alertIdx > exhaustionIdx && failIdx > alertIdx,
    'failTask must be called AFTER sendTelegram in the exhaustion branch')
})

test('genome completion-scan handles async sendTelegram (chains .catch on promise)', () => {
  assert.ok(
    scanSrc.includes("typeof tgResult.catch === 'function'") ||
    scanSrc.includes('tgResult.catch'),
    'async sendTelegram result must have .catch() chained to silence unhandled rejections'
  )
})

// ── Genome regression test ──────────────────────────────────────────────────

const testSrc = fs.readFileSync(GENOME_TEST, 'utf8')

test('genome regression test asserts sendTelegram is called on exhaustion', () => {
  assert.ok(
    testSrc.includes('sendTelegram') && testSrc.includes('exhausted'),
    'genome regression test must assert the Telegram alert fires on PR creation exhaustion'
  )
})

test('genome regression test verifies alert contains task_id and branch_name', () => {
  assert.ok(
    testSrc.includes('task-001') && testSrc.includes('dev/task-001'),
    'alert must include task_id and branch_name so on-call can identify the stalled task'
  )
})

// ── Verification doc ────────────────────────────────────────────────────────

test('genome commit verification doc exists in this repo', () => {
  assert.ok(fs.existsSync(VERIFY_DOC), 'docs/GENOME-DEV-COMMIT-VERIFICATION-0d86f6fc.md must exist')
})

test('verification doc names the genome commit hash', () => {
  const doc = fs.readFileSync(VERIFY_DOC, 'utf8')
  assert.ok(/28a855ff/.test(doc), 'verification doc must reference the genome commit hash (28a855ff)')
})

// ── Output ──────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
