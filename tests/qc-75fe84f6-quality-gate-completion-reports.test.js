'use strict'

/**
 * QC E2E Test: 75fe84f6 — quality gate completion-reports retention fix
 * Verifies the core gap closure: DEFAULT_MAX_REPORTS lowered to 50 and
 * deployment identity field added to health route.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`  FAIL: ${name} — ${err.message}`)
    failed++
  }
}

console.log('\n=== QC: quality-gate completion-reports retention fix ===\n')

// ── 1. Retention limit is 50 (not 400) ────────────────────────────────────────
test('DEFAULT_MAX_REPORTS is 50 in completion-reports-retention.js', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'scripts/tasks/completion-reports-retention.js'), 'utf8')
  assert.ok(src.includes('const DEFAULT_MAX_REPORTS = 50'),
    'DEFAULT_MAX_REPORTS must be 50 to stay under the 500-file quality gate limit')
  assert.ok(!src.includes('const DEFAULT_MAX_REPORTS = 400'),
    'Old value 400 must not be present')
})

// ── 2. Deployment identity field present in health route ──────────────────────
test("health route has app: 'leadflow-dashboard' identity field", () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'product/lead-response/dashboard/app/api/health/route.ts'), 'utf8')
  assert.ok(src.includes("app: 'leadflow-dashboard'"),
    "Identity field 'app: leadflow-dashboard' missing — needed to detect wrong-directory Vercel deploys")
})

// ── 3. E2E health check verifies deployment identity ─────────────────────────
test('e2e-flow-tests.sh checks app identity in health response', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/e2e-flow-tests.sh'), 'utf8')
  assert.ok(src.includes('"app":"leadflow-dashboard"'),
    'E2E health check must verify deployment identity to catch wrong-directory Vercel deploys')
})

// ── 4. E2E script supports skip exit code 42 ─────────────────────────────────
test('e2e-flow-tests.sh exit code 42 is treated as skip (not fail)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/e2e-flow-tests.sh'), 'utf8')
  assert.ok(src.includes('SKIPPED=0'), 'SKIPPED counter must be declared')
  assert.ok(src.includes('"$exit_code" -eq 42'), 'exit code 42 branch must exist')
  assert.ok(src.includes('status="skip"'), 'exit code 42 must set status=skip')
  // Verify the elif branch for 42 increments SKIPPED, not FAILED (structure: if 0 / elif 42 / else)
  assert.ok(src.includes('SKIPPED=$((SKIPPED + 1))'), 'exit code 42 must increment SKIPPED counter')
  // TOTAL must count skips: $((PASSED + FAILED + SKIPPED))
  assert.ok(src.includes('TOTAL=$((PASSED + FAILED + SKIPPED))'),
    'TOTAL must include SKIPPED in count')
})

// ── 5. Genome path fix: .openclaw/genome → projects/genome ───────────────────
test('genome-replenish-queue-ready-fix.test.js uses ~/projects/genome path', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'tests/unit/genome-replenish-queue-ready-fix.test.js'), 'utf8')
  assert.ok(src.includes('projects/genome/core/loops/execution-loop.js'),
    'Must use ~/projects/genome path (not ~/.openclaw/genome)')
  assert.ok(!src.includes('.openclaw/genome'),
    'Old .openclaw/genome path must be removed')
})

// ── 6. Playwright globalSetup env var set for potential external consumers ────
test('playwright-browser-setup.js sets PLAYWRIGHT_BASE_URL in globalSetup', () => {
  const src = fs.readFileSync(
    path.join(ROOT, 'scripts/playwright-browser-setup.js'), 'utf8')
  assert.ok(src.includes('process.env.PLAYWRIGHT_BASE_URL'),
    'globalSetup must set PLAYWRIGHT_BASE_URL')
  assert.ok(src.includes('localhost:3030') || src.includes('LOCAL_URL'),
    'Local dev server URL must be referenced')
})

console.log(`\n  Passed: ${passed} | Failed: ${failed}\n`)
if (failed > 0) process.exit(1)
