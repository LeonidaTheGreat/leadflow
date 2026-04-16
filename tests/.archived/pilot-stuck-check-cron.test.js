/**
 * Tests for /api/cron/pilot-stuck-check
 * Verifies the correct detection source (pilot_progress table, not onboarding_step)
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const PROJECT_ROOT = path.join(__dirname, '..')
const DASHBOARD_ROOT = path.join(PROJECT_ROOT, 'product/lead-response/dashboard')

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

console.log('\n=== pilot-stuck-check cron tests ===\n')

// ── Test 1: Route file exists ───────────────────────────────────────────────

console.log('1. Route file exists')
const routePath = path.join(DASHBOARD_ROOT, 'app/api/cron/pilot-stuck-check/route.ts')

test('route.ts file exists', () => {
  assert.ok(fs.existsSync(routePath), `Expected ${routePath} to exist`)
})

// ── Test 2: Route uses pilot_progress table (correct source) ────────────────

console.log('\n2. Uses correct detection source (pilot_progress)')
const routeContent = fs.readFileSync(routePath, 'utf-8')

test('Queries pilot_progress table', () => {
  assert.ok(
    routeContent.includes("from('pilot_progress')"),
    'Route must query pilot_progress table'
  )
})

test('Uses stage column (not onboarding_step)', () => {
  assert.ok(
    routeContent.includes('stage') && !routeContent.includes('onboarding_step'),
    'Route must use pilot_progress.stage, not onboarding_step'
  )
})

test('Uses stage_entered_at (not last_onboarding_step_update)', () => {
  assert.ok(
    routeContent.includes('stage_entered_at') && !routeContent.includes('last_onboarding_step_update'),
    'Route must use pilot_progress.stage_entered_at, not last_onboarding_step_update'
  )
})

test('Filters by stage != paid', () => {
  assert.ok(
    routeContent.includes("neq('stage', 'paid')"),
    'Route must filter out paid pilots'
  )
})

test('Checks for stuck_since IS NULL (not already alerted)', () => {
  assert.ok(
    routeContent.includes("is('stuck_since', null)"),
    'Route must check stuck_since IS NULL to avoid duplicate alerts'
  )
})

// ── Test 3: Sends Telegram alerts ───────────────────────────────────────────

console.log('\n3. Telegram alert integration')

test('Imports sendStuckPilotAlert from telegram-service', () => {
  assert.ok(
    routeContent.includes("import { sendStuckPilotAlert } from '@/lib/telegram-service'"),
    'Route must import sendStuckPilotAlert'
  )
})

test('Calls sendStuckPilotAlert for each stuck pilot', () => {
  assert.ok(
    routeContent.includes('sendStuckPilotAlert('),
    'Route must call sendStuckPilotAlert'
  )
})

// ── Test 4: Updates stuck_since after alerting ──────────────────────────────

console.log('\n4. Updates stuck_since after alerting')

test('Sets stuck_since after successful alert', () => {
  assert.ok(
    routeContent.includes("stuck_since: new Date().toISOString()"),
    'Route must update stuck_since timestamp after alerting'
  )
})

// ── Test 5: Cron authentication ─────────────────────────────────────────────

console.log('\n5. Cron authentication')

test('Checks CRON_SECRET', () => {
  assert.ok(
    routeContent.includes('CRON_SECRET'),
    'Route must check CRON_SECRET'
  )
})

test('Returns 401 for unauthorized requests', () => {
  assert.ok(
    routeContent.includes("{ status: 401 }") || routeContent.includes('{ status: 401 }'),
    'Route must return 401 for unauthorized requests'
  )
})

// ── Test 6: vercel.json includes the cron schedule ──────────────────────────

console.log('\n6. vercel.json cron configuration')
const vercelJsonPath = path.join(DASHBOARD_ROOT, 'vercel.json')

test('vercel.json exists', () => {
  assert.ok(fs.existsSync(vercelJsonPath), 'vercel.json must exist')
})

const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'))

test('vercel.json includes /api/cron/pilot-stuck-check', () => {
  const crons = vercelJson.crons || []
  const pilotStuckCron = crons.find((c) => c.path === '/api/cron/pilot-stuck-check')
  assert.ok(
    pilotStuckCron,
    `vercel.json crons must include /api/cron/pilot-stuck-check. Found: ${crons.map((c) => c.path).join(', ')}`
  )
})

test('pilot-stuck-check cron has a schedule', () => {
  const crons = vercelJson.crons || []
  const pilotStuckCron = crons.find((c) => c.path === '/api/cron/pilot-stuck-check')
  assert.ok(pilotStuckCron, 'cron entry must exist')
  assert.ok(
    pilotStuckCron.schedule && pilotStuckCron.schedule.length > 0,
    'cron entry must have a non-empty schedule'
  )
})

// ── Test 7: Does NOT use onboarding_step (the wrong source) ─────────────────

console.log('\n7. Does NOT use FUB onboarding wizard state (wrong source)')

test('Does NOT import onboarding-telemetry', () => {
  assert.ok(
    !routeContent.includes('onboarding-telemetry'),
    'Route must NOT import onboarding-telemetry (wrong detection source)'
  )
})

test('Does NOT reference onboarding_step', () => {
  assert.ok(
    !routeContent.includes('onboarding_step'),
    'Route must NOT reference onboarding_step (wrong detection source)'
  )
})

test('Does NOT reference last_onboarding_step_update', () => {
  assert.ok(
    !routeContent.includes('last_onboarding_step_update'),
    'Route must NOT reference last_onboarding_step_update (wrong detection source)'
  )
})

test('Does NOT reference checkAndAlertStuckAgents', () => {
  assert.ok(
    !routeContent.includes('checkAndAlertStuckAgents'),
    'Route must NOT call checkAndAlertStuckAgents (wrong detection source)'
  )
})

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n─────────────────────────────────`)
console.log(`Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`)
console.log(`─────────────────────────────────`)

if (failed > 0) {
  process.exit(1)
}
