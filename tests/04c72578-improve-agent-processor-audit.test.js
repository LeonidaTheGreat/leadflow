'use strict'

/**
 * QC E2E test: audit report for "Fix: Audit the improve-agent action_item processor"
 * PR #2184 — dev/04c72578-fix-audit-the-improve-agent-action-item
 * This PR ships zero leadflow code changes (the audited bug and its fix live in the
 * separate genome repo). This test verifies the audit deliverable itself is well-formed:
 * it states a verdict, points to the actual fix, and is honest about scope.
 * Run: node tests/04c72578-improve-agent-processor-audit.test.js
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const REPORT_PATH = path.join(ROOT, 'docs/reports/2026-08-03-improve-agent-processor-audit.md')

let passed = 0
let failed = 0

function check(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`❌ FAIL: ${name} — ${err.message}`)
    failed++
  }
}

check('report file exists', () => {
  assert.ok(fs.existsSync(REPORT_PATH), `missing ${REPORT_PATH}`)
})

const content = fs.readFileSync(REPORT_PATH, 'utf8')

check('states an explicit verdict', () => {
  assert.match(content, /\*\*Verdict:\*\*/)
})

check('links to the genome PR that carries the actual fix', () => {
  assert.match(content, /github\.com\/LeonidaTheGreat\/genome\/pull\/873/)
})

check('names the specific failure point (file + guard), not just a symptom', () => {
  assert.match(content, /strategic-review-loop\.js/)
  assert.match(content, /findTaskByTitle/)
})

check('explains why this leadflow PR carries no code diff', () => {
  assert.match(content, /no leadflow-side code to change/i)
})

check('report is additive only — no other files touched by this change', () => {
  const diff = require('child_process').execSync('git diff main...HEAD --name-only', { cwd: ROOT }).toString().trim()
  assert.strictEqual(diff, 'docs/reports/2026-08-03-improve-agent-processor-audit.md')
})

console.log(`\n${passed}/${passed + failed} passed`)
if (failed > 0) process.exit(1)
