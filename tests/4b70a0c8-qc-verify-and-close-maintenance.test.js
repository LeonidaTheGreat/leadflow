'use strict'
/**
 * QC E2E: PR #2145 — Verify and close UC fix-no-urgency-or-scarcity-mechanism
 *
 * Targets the 5 actual code changes in this PR:
 *  1. Health route: app identity field
 *  2. E2E script: exit-42 skip + identity check
 *  3. Playwright setup: local server URL preference
 *  4. Completion-reports retention: DEFAULT_MAX_REPORTS = 50
 *  5. Migration 026: task_locks schema
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
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`)
    failed++
  }
}

console.log('\n=== QC E2E: PR #2145 maintenance changes ===\n')

// ── 1. Health route identity ─────────────────────────────────────────────────
const healthRoute = fs.readFileSync(
  path.join(ROOT, 'product/lead-response/dashboard/app/api/health/route.ts'),
  'utf8'
)
test('health route exports app identity (leadflow-dashboard)', () => {
  assert.ok(healthRoute.includes("app: 'leadflow-dashboard'"), "Missing: app: 'leadflow-dashboard'")
})
test('health route identity is inside NextResponse.json() return block', () => {
  const jsonBlock = healthRoute.slice(healthRoute.indexOf('return NextResponse.json'))
  assert.ok(jsonBlock.includes("app: 'leadflow-dashboard'"), 'Identity not in JSON response')
})

// ── 2. E2E script: skip & identity check ─────────────────────────────────────
const e2eScript = fs.readFileSync(path.join(ROOT, 'scripts/e2e-flow-tests.sh'), 'utf8')
test('e2e script: exit code 42 treated as skip (not fail)', () => {
  assert.ok(e2eScript.includes('exit_code" -eq 42'), 'Skip branch missing for exit_code 42')
  assert.ok(e2eScript.includes('SKIPPED=$((SKIPPED + 1))'), 'SKIPPED counter not incremented')
})
test('e2e script: health check validates deployment identity', () => {
  assert.ok(e2eScript.includes('"app":"leadflow-dashboard"'), 'Identity check missing from health test')
})
test('e2e script: health check still validates api_connectivity', () => {
  assert.ok(e2eScript.includes('"api_connectivity":{"ok":true'), 'api_connectivity check removed')
})
test('e2e script: dashboard-no-errors returns 42 when no user found', () => {
  assert.ok(e2eScript.includes('return 42'), 'dashboard-no-errors must return 42 on missing user')
})
test('e2e script: SKIPPED included in TOTAL count', () => {
  assert.ok(e2eScript.includes('TOTAL=$((PASSED + FAILED + SKIPPED))'), 'TOTAL must include SKIPPED')
})
test('e2e script: JSON output includes skipped field', () => {
  // Shell echo line uses shell-escaped quotes; search for SKIPPED variable near skipped token
  assert.ok(
    e2eScript.includes('SKIPPED') && /skipped.*SKIPPED|SKIPPED.*skipped/s.test(e2eScript),
    'JSON output line missing skipped field'
  )
})

// ── 3. Playwright setup: local-first URL ─────────────────────────────────────
const pwSetup = fs.readFileSync(path.join(ROOT, 'scripts/playwright-browser-setup.js'), 'utf8')
test('playwright setup defines LOCAL_URL as localhost:3030', () => {
  assert.ok(pwSetup.includes("LOCAL_URL = 'http://localhost:3030'"), 'LOCAL_URL constant missing')
})
test('playwright setup sets PLAYWRIGHT_BASE_URL before browser install', () => {
  const baseUrlSet = pwSetup.indexOf('PLAYWRIGHT_BASE_URL')
  const browserInstall = pwSetup.indexOf('2. Install Chromium')
  assert.ok(baseUrlSet < browserInstall, 'URL selection must happen before browser install')
})
test('playwright setup falls back to Vercel when local unreachable', () => {
  assert.ok(pwSetup.includes('leadflow-ai-five.vercel.app'), 'Vercel fallback URL missing')
})
test('playwright setup respects pre-set PLAYWRIGHT_BASE_URL env var', () => {
  assert.ok(
    pwSetup.includes('if (!process.env.PLAYWRIGHT_BASE_URL)'),
    'Must skip URL selection when PLAYWRIGHT_BASE_URL already set'
  )
})

// ── 4. Completion-reports retention ─────────────────────────────────────────
const retention = fs.readFileSync(
  path.join(ROOT, 'scripts/tasks/completion-reports-retention.js'),
  'utf8'
)
test('DEFAULT_MAX_REPORTS is 50', () => {
  assert.ok(retention.includes('DEFAULT_MAX_REPORTS = 50'), 'DEFAULT_MAX_REPORTS must be 50')
})
test('DEFAULT_MAX_REPORTS is not 400 (old value)', () => {
  assert.ok(!retention.includes('DEFAULT_MAX_REPORTS = 400'), 'Old value 400 still present')
})

// ── 5. Migration 026: task_locks ─────────────────────────────────────────────
const migration = fs.readFileSync(path.join(ROOT, 'migrations/026_task_locks.sql'), 'utf8')
test('migration creates task_locks table with IF NOT EXISTS', () => {
  assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS task_locks'), 'IF NOT EXISTS guard missing')
})
test('migration has composite PRIMARY KEY (task_title, agent_id)', () => {
  assert.ok(migration.includes('PRIMARY KEY (task_title, agent_id)'), 'Composite PK missing')
})
test('migration includes expires_at for TTL cleanup', () => {
  assert.ok(migration.includes('expires_at'), 'expires_at column missing (needed for TTL)')
})
test('migration creates index on expires_at', () => {
  assert.ok(migration.includes('task_locks_expires_at_idx'), 'Index on expires_at missing')
})

console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
