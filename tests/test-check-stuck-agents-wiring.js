/**
 * test-check-stuck-agents-wiring.js
 *
 * Tests that createStuckAlerts() / checkAndAlertStuckAgents() is properly
 * wired into the heartbeat / scheduled execution paths.
 *
 * Tests:
 *   1. lib/onboarding-telemetry.js exports createStuckAlerts + checkAndAlertStuckAgents
 *   2. The Vercel cron route exists and imports onboarding-telemetry
 *   3. vercel.json includes /api/cron/check-stuck-agents in the crons array
 *   4. scripts/utilities/check-stuck-agents.js exists and exports a run() function
 *   5. check-stuck-agents.js correctly calls checkAndAlertStuckAgents
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

console.log('\n=== check-stuck-agents wiring tests ===\n')

// ── Test 1: lib/onboarding-telemetry.js exports the required functions ──────

console.log('1. onboarding-telemetry.js exports')
const telemetry = require(path.join(PROJECT_ROOT, 'lib/onboarding-telemetry'))

test('exports createStuckAlerts', () => {
  assert.strictEqual(typeof telemetry.createStuckAlerts, 'function', 'createStuckAlerts must be a function')
})

test('exports checkAndAlertStuckAgents', () => {
  assert.strictEqual(typeof telemetry.checkAndAlertStuckAgents, 'function', 'checkAndAlertStuckAgents must be a function')
})

// ── Test 2: Vercel cron route exists and references onboarding-telemetry ────

console.log('\n2. Vercel cron route (/api/cron/check-stuck-agents/route.ts)')
const cronRoutePath = path.join(DASHBOARD_ROOT, 'app/api/cron/check-stuck-agents/route.ts')

test('route.ts file exists', () => {
  assert.ok(
    fs.existsSync(cronRoutePath),
    `Expected ${cronRoutePath} to exist`
  )
})

test('route.ts imports onboarding-telemetry', () => {
  const content = fs.readFileSync(cronRoutePath, 'utf-8')
  assert.ok(
    content.includes('onboarding-telemetry'),
    'route.ts must import onboarding-telemetry'
  )
})

test('route.ts calls checkAndAlertStuckAgents', () => {
  const content = fs.readFileSync(cronRoutePath, 'utf-8')
  assert.ok(
    content.includes('checkAndAlertStuckAgents'),
    'route.ts must call checkAndAlertStuckAgents'
  )
})

// ── Test 3: vercel.json includes the cron schedule ───────────────────────────

console.log('\n3. vercel.json cron configuration')
const vercelJsonPath = path.join(DASHBOARD_ROOT, 'vercel.json')

test('vercel.json exists', () => {
  assert.ok(fs.existsSync(vercelJsonPath), 'vercel.json must exist')
})

test('vercel.json includes /api/cron/check-stuck-agents', () => {
  const content = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'))
  const crons = content.crons || []
  const stuckAgentCron = crons.find(c => c.path === '/api/cron/check-stuck-agents')
  assert.ok(
    stuckAgentCron,
    `vercel.json crons must include /api/cron/check-stuck-agents. Found: ${crons.map(c => c.path).join(', ')}`
  )
})

test('vercel.json check-stuck-agents cron has a schedule', () => {
  const content = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'))
  const crons = content.crons || []
  const stuckAgentCron = crons.find(c => c.path === '/api/cron/check-stuck-agents')
  assert.ok(stuckAgentCron, 'cron entry must exist')
  assert.ok(
    stuckAgentCron.schedule && stuckAgentCron.schedule.length > 0,
    'cron entry must have a non-empty schedule'
  )
})

// ── Test 4: Standalone script exists and exports run() ──────────────────────

console.log('\n4. scripts/utilities/check-stuck-agents.js')
const scriptPath = path.join(PROJECT_ROOT, 'scripts/utilities/check-stuck-agents.js')

test('check-stuck-agents.js exists', () => {
  assert.ok(fs.existsSync(scriptPath), `Expected ${scriptPath} to exist`)
})

test('check-stuck-agents.js exports run function', () => {
  const script = require(scriptPath)
  assert.strictEqual(typeof script.run, 'function', 'check-stuck-agents.js must export run()')
})

test('check-stuck-agents.js requires onboarding-telemetry', () => {
  const content = fs.readFileSync(scriptPath, 'utf-8')
  assert.ok(
    content.includes('onboarding-telemetry'),
    'check-stuck-agents.js must require lib/onboarding-telemetry'
  )
})

test('check-stuck-agents.js calls checkAndAlertStuckAgents', () => {
  const content = fs.readFileSync(scriptPath, 'utf-8')
  assert.ok(
    content.includes('checkAndAlertStuckAgents'),
    'check-stuck-agents.js must call checkAndAlertStuckAgents'
  )
})

// ── Test 5: Dashboard also has a copy of onboarding-telemetry ───────────────

console.log('\n5. Dashboard lib/onboarding-telemetry.js (used by route.ts)')
const dashboardTelemetryPath = path.join(DASHBOARD_ROOT, 'lib/onboarding-telemetry.js')

test('dashboard lib/onboarding-telemetry.js exists', () => {
  assert.ok(
    fs.existsSync(dashboardTelemetryPath),
    `Expected ${dashboardTelemetryPath} to exist (used by the Next.js API route)`
  )
})

test('dashboard telemetry exports checkAndAlertStuckAgents', () => {
  const content = fs.readFileSync(dashboardTelemetryPath, 'utf-8')
  assert.ok(
    content.includes('checkAndAlertStuckAgents'),
    'dashboard onboarding-telemetry.js must export checkAndAlertStuckAgents'
  )
})

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n─────────────────────────────────`)
console.log(`Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`)
console.log(`─────────────────────────────────`)

if (failed > 0) {
  process.exit(1)
}
