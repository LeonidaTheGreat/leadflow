/**
 * E2E Test: PR #1896 — Investigate orphan branch dev/943b9f7f-admin-sales-cockpit
 * Validates the investigation claims in the completion report are accurate.
 *
 * NOTE: This test exposes factual errors in the PR's investigation JSON.
 * The cherry-pick 36a3b8f9 is NOT on main — it's on a rescue branch only.
 * The feature shipped via PR #1844 with Next.js routes, not Express routes.
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
    console.log(`FAIL: ${name} — ${err.message}`)
    failed++
  }
}

const PROJECT_DIR = path.resolve(__dirname, '..')
const TASK_ID = '7942f107-fa36-44a0-aadd-705d25d36bb2'
const ORPHAN_BRANCH = 'dev/943b9f7f-admin-sales-cockpit'
const ACTUAL_SHIPPING_PR = '1844'
const CHERRY_PICK_COMMIT = '36a3b8f9'

console.log('=== E2E: PR #1896 — Orphan Branch Investigation ===\n')

// 1. Completion report file (with task ID) exists
test('completion report file exists on branch', () => {
  const files = fs.readdirSync(path.join(PROJECT_DIR, 'completion-reports'))
  const match = files.find(f => f.includes(TASK_ID))
  assert.ok(match, `No completion report found for task ${TASK_ID}`)
})

// 2. Orphan branch still exists on remote
test('orphan branch exists on remote (confirming investigation subject)', () => {
  const result = execSync(
    `git ls-remote origin ${ORPHAN_BRANCH}`,
    { cwd: PROJECT_DIR, encoding: 'utf8' }
  ).trim()
  assert.ok(result.length > 0, `Branch ${ORPHAN_BRANCH} not found on remote — either deleted or name changed`)
})

// 3. CORRECTNESS CHECK: cherry-pick 36a3b8f9 is NOT on main
//    The investigation JSON claims "shippedVia: cherry-pick 36a3b8f9 + PR #1844" — this is WRONG.
//    The cherry-pick is only on origin/dev/943b9f7f-dev-rescue-uc-admin-sales-cockpit-admin.
test('cherry-pick 36a3b8f9 is NOT on main (investigation claim is incorrect)', () => {
  const result = execSync(
    `git log main --oneline | grep ${CHERRY_PICK_COMMIT.slice(0, 7)} || true`,
    { cwd: PROJECT_DIR, encoding: 'utf8', shell: true }
  ).trim()
  assert.strictEqual(result, '', `cherry-pick ${CHERRY_PICK_COMMIT} SHOULD NOT be on main — but found: ${result}`)
})

// 4. CORRECTNESS CHECK: Express routes from orphan branch are NOT on main
//    The investigation JSON lists AdminPilotsService.js and routes/admin/pilots.js as shipped
//    but these files do not exist on main. The feature shipped via Next.js routes (PR #1844).
test('AdminPilotsService.js is NOT on main (Express route never merged)', () => {
  let found = false
  try {
    execSync(`git show main:lib/services/AdminPilotsService.js`, { cwd: PROJECT_DIR })
    found = true
  } catch (e) { /* expected — file not on main */ }
  assert.strictEqual(found, false, 'AdminPilotsService.js found on main — investigation claim may be correct')
})

test('routes/admin/pilots.js is NOT on main (Express route never merged)', () => {
  let found = false
  try {
    execSync(`git show main:routes/admin/pilots.js`, { cwd: PROJECT_DIR })
    found = true
  } catch (e) { /* expected — file not on main */ }
  assert.strictEqual(found, false, 'routes/admin/pilots.js found on main — investigation claim may be correct')
})

// 5. CORRECTNESS CHECK: Actual shipping was PR #1844 via Next.js routes
test('PR #1844 shipped the feature via Next.js sales-cockpit route', () => {
  const result = execSync(
    `git log main --oneline | grep a1dd8c8a`,
    { cwd: PROJECT_DIR, encoding: 'utf8', shell: true }
  ).trim()
  assert.ok(result.length > 0, 'PR #1844 commit (a1dd8c8a) not found on main')
})

test('Next.js sales-cockpit route exists on main (actual shipped path)', () => {
  const salesCockpitPath = path.join(PROJECT_DIR, 'product/lead-response/dashboard/app/api/admin/sales-cockpit/route.ts')
  assert.ok(fs.existsSync(salesCockpitPath), `Next.js sales-cockpit route not found at ${salesCockpitPath}`)
})

// 6. Third-investigation systemic issue: PR #1857 already investigated same branch
test('prior investigation PR #1857 commit exists on main (third dupe detected)', () => {
  const result = execSync(
    `git log main --oneline | grep d38c62fe`,
    { cwd: PROJECT_DIR, encoding: 'utf8', shell: true }
  ).trim()
  assert.ok(result.length > 0, 'PR #1857 commit not found — cannot confirm this is a duplicate investigation')
})

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
if (failed > 0) {
  console.log('\nNote: FAIL on cherry-pick/file tests = investigation JSON has incorrect factual claims.')
  process.exit(1)
}
