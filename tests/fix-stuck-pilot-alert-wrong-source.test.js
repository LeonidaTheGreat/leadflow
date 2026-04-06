/**
 * E2E test: fix-stuck-pilot-alert-wired-to-wrong-detection-source
 * Task: 1e7f4c6b-f1c5-4bde-bae3-650f7a6a9daf
 *
 * Verifies:
 * 1. lib/stuck-pilots-service.js exists and exports checkAndAlertStuckPilots
 * 2. The service queries pilot_progress (not onboarding_events/telemetry)
 * 3. routes/check-stuck-pilots.js exists and mounts GET /api/cron/check-stuck-pilots
 * 4. server.js registers the new route
 * 5. Root vercel.json wires the cron at 0 8 * * *
 * 6. The service uses stuck_since guard (once per stage, not repeated alerts)
 * 7. Does NOT call checkAndAlertStuckAgents
 * 8. The Express route returns structured JSON on success
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = '/Users/clawdbot/projects/leadflow'

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS  ${name}`)
    passed++
  } catch (err) {
    console.log(`  FAIL  ${name}: ${err.message}`)
    failed++
  }
}

console.log('\n=== fix-stuck-pilot-alert-wrong-source ===\n')

// ── 1. Service file ──────────────────────────────────────────────────────────

console.log('1. lib/stuck-pilots-service.js')
const servicePath = path.join(ROOT, 'lib/stuck-pilots-service.js')

test('service file exists', () => {
  assert.ok(fs.existsSync(servicePath), `Expected ${servicePath} to exist`)
})

const serviceContent = fs.readFileSync(servicePath, 'utf8')

test('exports checkAndAlertStuckPilots', () => {
  assert.ok(
    serviceContent.includes('checkAndAlertStuckPilots'),
    'Service must export checkAndAlertStuckPilots'
  )
})

test('queries pilot_progress table (correct source)', () => {
  assert.ok(
    serviceContent.includes('pilot_progress'),
    'Service must query pilot_progress table'
  )
})

test('uses stage_entered_at column', () => {
  assert.ok(
    serviceContent.includes('stage_entered_at'),
    'Service must use stage_entered_at from pilot_progress'
  )
})

test('filters stage != paid', () => {
  assert.ok(
    serviceContent.includes("!= 'paid'") || serviceContent.includes("neq('stage'") || serviceContent.includes("stage != 'paid'"),
    "Service must filter out paid pilots"
  )
})

test('guards with stuck_since IS NULL (once-per-stage)', () => {
  assert.ok(
    serviceContent.includes('stuck_since IS NULL') || serviceContent.includes("is('stuck_since', null)"),
    'Service must check stuck_since IS NULL to avoid duplicate alerts'
  )
})

test('sets stuck_since after alerting', () => {
  assert.ok(
    serviceContent.includes('stuck_since'),
    'Service must set stuck_since to prevent duplicate alerts'
  )
})

test('does NOT reference onboarding_events or onboarding-telemetry', () => {
  assert.ok(
    !serviceContent.includes('onboarding_events') && !serviceContent.includes('onboarding-telemetry'),
    'Service must NOT use onboarding_events or onboarding-telemetry (wrong source)'
  )
})

test('does NOT call checkAndAlertStuckAgents', () => {
  assert.ok(
    !serviceContent.includes('checkAndAlertStuckAgents'),
    'Service must NOT delegate to checkAndAlertStuckAgents'
  )
})

// ── 2. Express route ─────────────────────────────────────────────────────────

console.log('\n2. routes/check-stuck-pilots.js')
const routePath = path.join(ROOT, 'routes/check-stuck-pilots.js')

test('route file exists', () => {
  assert.ok(fs.existsSync(routePath), `Expected ${routePath} to exist`)
})

const routeContent = fs.readFileSync(routePath, 'utf8')

test('mounts GET /api/cron/check-stuck-pilots', () => {
  assert.ok(
    routeContent.includes('/api/cron/check-stuck-pilots'),
    'Route must handle /api/cron/check-stuck-pilots'
  )
})

test('imports checkAndAlertStuckPilots from lib/stuck-pilots-service', () => {
  assert.ok(
    routeContent.includes('stuck-pilots-service'),
    'Route must import from lib/stuck-pilots-service'
  )
})

test('returns success: true on 200', () => {
  assert.ok(
    routeContent.includes('success: true') || routeContent.includes("'success', true"),
    'Route must return success: true on success'
  )
})

test('returns 500 on error', () => {
  assert.ok(
    routeContent.includes('500'),
    'Route must return 500 on internal error'
  )
})

// ── 3. server.js registration ────────────────────────────────────────────────

console.log('\n3. server.js registers the route')
const serverContent = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8')

test('server.js requires check-stuck-pilots router', () => {
  assert.ok(
    serverContent.includes('check-stuck-pilots'),
    'server.js must require the check-stuck-pilots router'
  )
})

test('server.js mounts the router', () => {
  const idx = serverContent.indexOf('check-stuck-pilots')
  const surroundingCode = serverContent.substring(Math.max(0, idx - 100), idx + 200)
  assert.ok(
    surroundingCode.includes('Router') || surroundingCode.includes('app.use') || surroundingCode.includes('require'),
    'server.js must mount the check-stuck-pilots router'
  )
})

// ── 4. vercel.json cron wiring ───────────────────────────────────────────────

console.log('\n4. Root vercel.json cron wiring')
const vercelJsonPath = path.join(ROOT, 'vercel.json')
const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'))
const crons = vercelJson.crons || []

test('vercel.json includes /api/cron/check-stuck-pilots', () => {
  const entry = crons.find(c => c.path === '/api/cron/check-stuck-pilots')
  assert.ok(entry, `Expected /api/cron/check-stuck-pilots in vercel.json crons. Found: ${crons.map(c => c.path).join(', ')}`)
})

test('/api/cron/check-stuck-pilots runs daily at 08:00 UTC', () => {
  const entry = crons.find(c => c.path === '/api/cron/check-stuck-pilots')
  assert.ok(entry, 'cron entry must exist')
  assert.strictEqual(entry.schedule, '0 8 * * *', `Expected schedule '0 8 * * *', got '${entry.schedule}'`)
})

test('existing check-stuck-agents cron is NOT removed from webhook vercel.json', () => {
  // Root vercel.json is for fub-inbound-webhook — it never had check-stuck-agents, that's dashboard only
  // Verify the dashboard vercel.json still has it
  const dashVercelPath = path.join(ROOT, 'product/lead-response/dashboard/vercel.json')
  const dashVercel = JSON.parse(fs.readFileSync(dashVercelPath, 'utf8'))
  const dashCrons = dashVercel.crons || []
  const agentsCron = dashCrons.find(c => c.path === '/api/cron/check-stuck-agents')
  assert.ok(agentsCron, 'Dashboard vercel.json must still have /api/cron/check-stuck-agents')
})

// ── 5. Module loads without errors ───────────────────────────────────────────

console.log('\n5. Module integrity')

test('lib/stuck-pilots-service.js is valid JS (require succeeds)', () => {
  // Suppress DB connection by ensuring LOCAL_PG_URL is not set during this test
  const originalEnv = process.env.LOCAL_PG_URL
  delete process.env.LOCAL_PG_URL
  try {
    delete require.cache[require.resolve(path.join(ROOT, 'lib/stuck-pilots-service.js'))]
    const svc = require(path.join(ROOT, 'lib/stuck-pilots-service.js'))
    assert.strictEqual(typeof svc.checkAndAlertStuckPilots, 'function', 'Must export checkAndAlertStuckPilots as a function')
  } finally {
    if (originalEnv !== undefined) process.env.LOCAL_PG_URL = originalEnv
  }
})

test('routes/check-stuck-pilots.js is valid JS (require succeeds)', () => {
  try {
    delete require.cache[require.resolve(path.join(ROOT, 'routes/check-stuck-pilots.js'))]
    const router = require(path.join(ROOT, 'routes/check-stuck-pilots.js'))
    assert.ok(router && typeof router === 'function', 'Must export an Express router')
  } catch (err) {
    throw new Error(`require failed: ${err.message}`)
  }
})

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n─────────────────────────────────`)
console.log(`Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`)
console.log(`─────────────────────────────────\n`)

if (failed > 0) {
  process.exit(1)
}
