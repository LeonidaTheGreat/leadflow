/**
 * QC E2E test for task 3aa691d3 — PR #1105 CalcomService / service-layer refactor review
 *
 * Documents 4 blockers that must be fixed before this PR can merge:
 * 1. CalcomService.js does NOT exist (primary task unmet)
 * 2. vercel.json missing 2 cron jobs (accidental deletion)
 * 3. satisfaction-ping route reverted to wrong table (regression)
 * 4. trial-signup route has inline sample-data seeding (architectural violation)
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const ROOT = path.join(__dirname, '..')
const LIB = path.join(ROOT, 'lib')
const DASHBOARD = path.join(ROOT, 'product/lead-response/dashboard')
const services = (f) => path.join(LIB, 'services', f)
const dashServices = (f) => path.join(DASHBOARD, 'lib/services', f)
const routes = (f) => path.join(DASHBOARD, 'app/api', f)

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`  FAIL: ${name} — ${err.message}`)
    failed++
  }
}

// ── 1. CalcomService must exist (primary task acceptance criterion) ─────────
console.log('\n1. CalcomService acceptance criteria')

test('lib/services/CalcomService.js exists', () => {
  assert.ok(
    fs.existsSync(services('CalcomService.js')) || fs.existsSync(services('CalcomService.ts')),
    'CalcomService.js not found — primary task acceptance criterion not met'
  )
})

test('calcom files consolidated: lib/calcom-webhook-handler.js removed or merged', () => {
  // After consolidation, calcom-webhook-handler should be absorbed into CalcomService
  const handlerExists = fs.existsSync(path.join(LIB, 'calcom-webhook-handler.js'))
  const calcomSvcExists = fs.existsSync(services('CalcomService.js')) || fs.existsSync(services('CalcomService.ts'))
  assert.ok(!handlerExists || calcomSvcExists,
    'lib/calcom-webhook-handler.js still exists and no CalcomService to replace it — consolidation incomplete')
})

// ── 2. vercel.json must retain pilot cron jobs ────────────────────────────
console.log('\n2. vercel.json cron configuration')

const vercelJson = JSON.parse(fs.readFileSync(path.join(DASHBOARD, 'vercel.json'), 'utf8'))
const cronPaths = (vercelJson.crons || []).map(c => c.path)

test('/api/cron/pilot-trial-cta retained in vercel.json', () => {
  assert.ok(cronPaths.includes('/api/cron/pilot-trial-cta'),
    'Missing cron: /api/cron/pilot-trial-cta — was present on main, removed by this PR')
})

test('/api/cron/pilot-stuck-check retained in vercel.json', () => {
  assert.ok(cronPaths.includes('/api/cron/pilot-stuck-check'),
    'Missing cron: /api/cron/pilot-stuck-check — was present on main, removed by this PR')
})

// ── 3. satisfaction-ping must use real_estate_agents table ────────────────
console.log('\n3. satisfaction-ping route table reference')

const satPingRoute = fs.readFileSync(routes('agents/satisfaction-ping/route.ts'), 'utf8')

test('satisfaction-ping uses real_estate_agents (not agents)', () => {
  assert.ok(satPingRoute.includes("from('real_estate_agents')") || satPingRoute.includes('from("real_estate_agents")'),
    'satisfaction-ping/route.ts does not use real_estate_agents — reverted to old agents table')
})

test('satisfaction-ping does NOT use legacy agents table', () => {
  assert.ok(!satPingRoute.includes("from('agents')") && !satPingRoute.includes('from("agents")'),
    'satisfaction-ping/route.ts references agents table — product-api-table-migration regression')
})

// ── 4. trial-signup route must not contain inline sample data ─────────────
console.log('\n4. trial-signup route architecture')

const trialSignup = fs.readFileSync(routes('auth/trial-signup/route.ts'), 'utf8')

test('trial-signup does not define SAMPLE_LEADS inline', () => {
  assert.ok(!trialSignup.includes('const SAMPLE_LEADS'),
    'trial-signup/route.ts defines SAMPLE_LEADS inline — extract to SampleDataService')
})

// ── 5. DB consolidation is complete (confirm the good work) ───────────────
console.log('\n5. DB layer consolidation (positive checks)')

test('lib/db.js exists', () => {
  assert.ok(fs.existsSync(path.join(LIB, 'db.js')), 'lib/db.js not found')
})

test('lib/db-client.js removed', () => {
  assert.ok(!fs.existsSync(path.join(LIB, 'db-client.js')), 'lib/db-client.js still exists')
})

test('lib/db-pool.js removed', () => {
  assert.ok(!fs.existsSync(path.join(LIB, 'db-pool.js')), 'lib/db-pool.js still exists')
})

test('lib/pg-pool.js removed', () => {
  assert.ok(!fs.existsSync(path.join(LIB, 'pg-pool.js')), 'lib/pg-pool.js still exists')
})

// ── 6. Dashboard services exist (positive check) ─────────────────────────
console.log('\n6. Dashboard service classes (positive checks)')

for (const svc of ['AuthService.js', 'AgentService.js', 'LeadService.js', 'MessageService.js', 'EventService.js']) {
  test(`${svc} exists`, () => {
    assert.ok(fs.existsSync(dashServices(svc)), `${svc} missing`)
  })
}

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
if (failed > 0) {
  process.exit(1)
}
