/**
 * E2E Test: PR #1894 — investigate orphan branch dev/14e80f40
 * Verifies the investigation claims are accurate against the live codebase.
 * The completion report itself is in the PR; we validate its claims hold on main.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const assert = require('assert')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`FAIL: ${name}`)
    console.log(`  ${err.message}`)
    failed++
  }
}

console.log('=== E2E: PR #1894 — Orphan Branch Investigation ===\n')

const ROOT = path.resolve(__dirname, '..')
const PAGE_PATH = path.join(ROOT, 'product/lead-response/dashboard/app/page.tsx')
const TEST_FILE_PATH = path.join(ROOT, 'tests/e2e/fix-no-urgency-or-scarcity-mechanism.test.js')
const PR_BRANCH = 'origin/dev/de2a726d-investigate-orphan-branch-dev-14e80f40-d'

test('Investigation claim: urgency banner ships on main', () => {
  assert.ok(fs.existsSync(PAGE_PATH), `page.tsx not found at ${PAGE_PATH}`)
  const content = fs.readFileSync(PAGE_PATH, 'utf8')
  assert.ok(content.includes('data-testid="urgency-banner"'), 'urgency-banner testid must be on main')
  assert.ok(content.includes('Only 10 pilot spots remaining'), 'scarcity text must be on main')
  assert.ok(content.includes('Apply Now'), 'Apply Now CTA must be on main')
})

test('Investigation claim: urgency e2e test exists on main', () => {
  assert.ok(fs.existsSync(TEST_FILE_PATH), `E2E test file not found at ${TEST_FILE_PATH}`)
})

test('PR branch contains completion report with required fields', () => {
  // Read the report directly from the PR branch
  const raw = execSync(`git show ${PR_BRANCH}:completion-reports/COMPLETION-de2a726d-f70d-4d2a-9e5f-0b0d89ed9840-20260716.json`, {
    cwd: ROOT
  }).toString()
  const report = JSON.parse(raw)
  assert.strictEqual(report.status, 'completed', 'report status must be "completed"')
  assert.ok(report.rootCauseAnalysis, 'rootCauseAnalysis must be present')
  assert.ok(report.rootCauseAnalysis.failurePoint, 'failurePoint must be present')
  assert.ok(report.rootCauseAnalysis.why, 'why must be present')
  assert.ok(report.rootCauseAnalysis.fix, 'fix must be present')
  assert.ok(report.investigation, 'investigation block must be present')
  assert.ok(report.investigation.orphanBranch.includes('14e80f40'), 'orphanBranch must reference 14e80f40')
  assert.strictEqual(report.investigation.safeToDelete, true, 'safeToDelete must be true')
  assert.strictEqual(report.investigation.workAlreadyOnMain, true, 'workAlreadyOnMain must be true')
})

console.log('\n=== REPORT ===')
console.log(`Passed: ${passed}`)
console.log(`Failed: ${failed}`)

if (failed > 0) process.exit(1)
