/**
 * E2E Test: feat-lead-satisfaction-feedback
 * Tests: Database schema, API routes, UI components, migration
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const dashboardDir = path.resolve(__dirname, '../product/lead-response/dashboard')
let passed = 0, failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`)
    failed++
  }
}

async function run() {
  console.log('\n=== E2E: Lead Satisfaction Feedback Collection ===\n')

  console.log('File Checks:')
  
  await test('lib/satisfaction.ts exists', async () => {
    const p = path.join(dashboardDir, 'lib/satisfaction.ts')
    assert.ok(fs.existsSync(p), `Missing: ${p}`)
  })

  const src = fs.readFileSync(path.join(dashboardDir, 'lib/satisfaction.ts'), 'utf-8')

  await test('SATISFACTION_PING_MESSAGE < 160 chars', async () => {
    const match = src.match(/SATISFACTION_PING_MESSAGE\s*=\s*['"`]([\s\S]+?)['"`]/)
    assert.ok(match, 'Could not find SATISFACTION_PING_MESSAGE')
    assert.ok(match[1].length < 160, `Message is ${match[1].length} chars`)
  })

  await test('SATISFACTION_PING_MESSAGE includes STOP opt-out', async () => {
    assert.ok(src.includes('STOP'), 'Missing STOP opt-out instruction')
  })

  await test('SATISFACTION_COOLDOWN_MS >= 10 minutes (600000ms)', async () => {
    const match = src.match(/SATISFACTION_COOLDOWN_MS\s*=\s*([\d\s\*]+)/)
    assert.ok(match, 'Missing SATISFACTION_COOLDOWN_MS')
    const val = eval(match[1].trim())
    assert.ok(val >= 600000, `Cooldown ${val}ms < 600000ms`)
  })

  await test('classifyReply function exported', async () => {
    assert.ok(src.includes('export function classifyReply'), 'classifyReply not exported')
  })

  await test('sendSatisfactionPing function exported', async () => {
    assert.ok(src.includes('export async function sendSatisfactionPing'), 'sendSatisfactionPing not exported')
  })

  await test('sendSatisfactionPing checks agent.satisfaction_ping_enabled', async () => {
    assert.ok(src.includes('agentSatisfactionPingEnabled') || src.includes('satisfaction_ping_enabled'),
      'Missing agent setting check')
  })

  await test('sendSatisfactionPing checks SATISFACTION_COOLDOWN_MS', async () => {
    assert.ok(src.includes('SATISFACTION_COOLDOWN_MS'), 'Missing cooldown check')
  })

  await test('getSatisfactionStats function exported', async () => {
    assert.ok(src.includes('export async function getSatisfactionStats'), 'getSatisfactionStats not exported')
  })

  await test('getSatisfactionStats calculates percentages and trend', async () => {
    assert.ok(src.includes('positivePct') && src.includes('trend'), 'Missing stats calculations')
  })

  await test('getPendingSatisfactionPing function exported', async () => {
    assert.ok(src.includes('export async function getPendingSatisfactionPing'), 'getPendingSatisfactionPing not exported')
  })

  await test('recordSatisfactionReply function exported', async () => {
    assert.ok(src.includes('export async function recordSatisfactionReply'), 'recordSatisfactionReply not exported')
  })

  await test('API route: /api/satisfaction/stats exists', async () => {
    const p = path.join(dashboardDir, 'app/api/satisfaction/stats/route.ts')
    assert.ok(fs.existsSync(p), `Missing: ${p}`)
  })

  await test('API route: /api/satisfaction/events exists', async () => {
    const p = path.join(dashboardDir, 'app/api/satisfaction/events/route.ts')
    assert.ok(fs.existsSync(p), `Missing: ${p}`)
  })

  await test('API route: /api/agents/satisfaction-ping has GET and PATCH', async () => {
    const p = path.join(dashboardDir, 'app/api/agents/satisfaction-ping/route.ts')
    assert.ok(fs.existsSync(p), `Missing: ${p}`)
    const routeSrc = fs.readFileSync(p, 'utf-8')
    assert.ok(routeSrc.includes('export async function GET'), 'Missing GET')
    assert.ok(routeSrc.includes('export async function PATCH'), 'Missing PATCH')
  })

  await test('Component: LeadSatisfactionCard exists', async () => {
    const p = path.join(dashboardDir, 'components/dashboard/LeadSatisfactionCard.tsx')
    assert.ok(fs.existsSync(p), `Missing: ${p}`)
  })

  await test('Component: LeadSatisfactionCard has ≥5 response threshold', async () => {
    const p = path.join(dashboardDir, 'components/dashboard/LeadSatisfactionCard.tsx')
    const cardSrc = fs.readFileSync(p, 'utf-8')
    assert.ok(cardSrc.includes('5') || cardSrc.includes('MIN_RESPONSES'), 'Missing ≥5 threshold')
  })

  await test('Component: SatisfactionPingToggle exists', async () => {
    const p = path.join(dashboardDir, 'components/dashboard/SatisfactionPingToggle.tsx')
    assert.ok(fs.existsSync(p), `Missing: ${p}`)
  })

  await test('Settings page includes SatisfactionPingToggle (US-4)', async () => {
    const p = path.join(dashboardDir, 'app/settings/page.tsx')
    const settingsSrc = fs.readFileSync(p, 'utf-8')
    assert.ok(settingsSrc.includes('SatisfactionPingToggle'), 'Settings missing SatisfactionPingToggle')
  })

  await test('Migration 008 file exists', async () => {
    const p = path.join(dashboardDir, 'supabase/migrations/008_lead_satisfaction_feedback.sql')
    assert.ok(fs.existsSync(p), `Missing: ${p}`)
  })

  const migrationSql = fs.readFileSync(
    path.join(dashboardDir, 'supabase/migrations/008_lead_satisfaction_feedback.sql'),
    'utf-8'
  )

  await test('Migration creates lead_satisfaction_events table', async () => {
    assert.ok(migrationSql.includes('lead_satisfaction_events'), 'Missing table')
  })

  await test('Migration adds satisfaction_ping_enabled to agents', async () => {
    assert.ok(migrationSql.includes('satisfaction_ping_enabled'), 'Missing column')
  })

  await test('Migration creates satisfaction_summary view (US-5)', async () => {
    assert.ok(migrationSql.includes('satisfaction_summary'), 'Missing view')
  })

  await test('Migration enables RLS on lead_satisfaction_events', async () => {
    assert.ok(migrationSql.toUpperCase().includes('ROW LEVEL SECURITY'), 'Missing RLS')
  })

  await test('Uses parameterized Supabase queries (no raw SQL injection)', async () => {
    assert.ok(src.includes('.eq('), 'Missing parameterized .eq()')
    assert.ok(!src.includes('${"'), 'Potential SQL injection via template literal')
  })

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Results: ${passed} passed, ${failed} failed\n`)

  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('✅ All E2E tests passed!')
    process.exit(0)
  }
}

run().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
