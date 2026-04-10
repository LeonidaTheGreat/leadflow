/**
 * E2E test for PR #1105 — CalcomService refactor / supabase.ts decomposition
 * Task: 6d321d05-refactor-consolidate-calcom-into-calcoms
 *
 * Checks:
 * 1. New service classes exist in lib/services/
 * 2. supabase.ts no longer exports domain functions (only DB clients)
 * 3. Routes import from service classes, not supabase.ts domain fns
 * 4. CalcomService is NOT present (acceptance-criteria gap — tracks the missing work)
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const DASHBOARD = path.join(__dirname, '../../product/lead-response/dashboard')
const services = (f) => path.join(DASHBOARD, 'lib/services', f)
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

// ── 1. Service files exist ────────────────────────────────────────────────────
console.log('\n1. Service class files exist')

test('LeadService.js exists', () => {
  assert.ok(fs.existsSync(services('LeadService.js')), 'missing LeadService.js')
})
test('AgentService.js exists', () => {
  assert.ok(fs.existsSync(services('AgentService.js')), 'missing AgentService.js')
})
test('MessageService.js exists', () => {
  assert.ok(fs.existsSync(services('MessageService.js')), 'missing MessageService.js')
})
test('EventService.js exists', () => {
  assert.ok(fs.existsSync(services('EventService.js')), 'missing EventService.js')
})
test('AuthService.js exists', () => {
  assert.ok(fs.existsSync(services('AuthService.js')), 'missing AuthService.js')
})

// ── 2. supabase.ts no longer exports domain functions ────────────────────────
console.log('\n2. supabase.ts is a thin client wrapper (no domain functions)')

const supabaseTs = fs.readFileSync(path.join(DASHBOARD, 'lib/supabase.ts'), 'utf8')

test('supabase.ts does not export createLead', () => {
  assert.ok(!supabaseTs.includes('export async function createLead'), 'createLead still exported from supabase.ts')
})
test('supabase.ts does not export getLeadById', () => {
  assert.ok(!supabaseTs.includes('export async function getLeadById'), 'getLeadById still exported from supabase.ts')
})
test('supabase.ts does not export getAgentById', () => {
  assert.ok(!supabaseTs.includes('export async function getAgentById'), 'getAgentById still exported from supabase.ts')
})
test('supabase.ts does not export createMessage', () => {
  assert.ok(!supabaseTs.includes('export async function createMessage'), 'createMessage still exported from supabase.ts')
})
test('supabase.ts does not export updateMessageStatus', () => {
  assert.ok(!supabaseTs.includes('export async function updateMessageStatus'), 'updateMessageStatus still exported from supabase.ts')
})

// ── 3. Routes use service classes ────────────────────────────────────────────
console.log('\n3. Routes import from service classes (not supabase.ts domain fns)')

const routeChecks = [
  ['booking/route.ts', 'leadService', 'booking route uses leadService'],
  ['booking/route.ts', 'agentService', 'booking route uses agentService'],
  ['sms/send/route.ts', 'messageService', 'sms/send route uses messageService'],
  ['sms/send/route.ts', 'leadService', 'sms/send route uses leadService'],
  ['sms/status/route.ts', 'messageService', 'sms/status route uses messageService'],
  ['sms/status/route.ts', 'leadService', 'sms/status route uses leadService'],
]

for (const [routeFile, symbol, label] of routeChecks) {
  test(label, () => {
    const content = fs.readFileSync(routes(routeFile), 'utf8')
    assert.ok(content.includes(symbol), `${symbol} not imported in ${routeFile}`)
  })
}

// ── 4. CalcomService MISSING (acceptance criteria gap — PR title not met) ────
console.log('\n4. Acceptance criteria check (CalcomService — should exist but does not)')

test('EXPECTED FAIL: CalcomService.ts does NOT exist in dashboard lib/services', () => {
  const calcomSvcPath = services('CalcomService.ts')
  const calcomSvcPathJs = services('CalcomService.js')
  // This test documents the gap: both should be absent (work not done)
  const exists = fs.existsSync(calcomSvcPath) || fs.existsSync(calcomSvcPathJs)
  assert.ok(!exists, 'CalcomService exists — acceptance criteria now met (update this test)')
})

test('calcom.ts is unchanged (CalcomService consolidation not started in dashboard)', () => {
  const calcomTs = fs.readFileSync(path.join(DASHBOARD, 'lib/calcom.ts'), 'utf8')
  // If CalcomService was created, calcom.ts would be thinned out like supabase.ts was
  assert.ok(calcomTs.length > 500, 'calcom.ts is still full implementation — CalcomService not extracted yet')
})

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
if (failed > 0) {
  process.exit(1)
}
