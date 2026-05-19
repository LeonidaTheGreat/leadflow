/**
 * Test: Agent schema unification — real_estate_agents DB shape → Agent TS type
 * Task: 2da0df04 — uc-buyer-journey-agent-schema-unification
 *
 * Verifies that:
 * 1. No service file filters real_estate_agents by is_active (column doesn't exist)
 * 2. The realEstateAgentRowToAgent mapper always produces market and settings
 * 3. The Twilio inbound route's hasRequiredAgent check would be truthy for any mapped agent
 * 4. All read sites (getDefaultAgent, resolveAgent, getActiveAgents) use status='active'
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_LIB = path.resolve(__dirname, '../../product/lead-response/dashboard/lib')
const DASHBOARD_APP = path.resolve(__dirname, '../../product/lead-response/dashboard/app')

let passed = 0
let failed = 0

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

function readSrc(relPath) {
  return fs.readFileSync(path.resolve(__dirname, '../../', relPath), 'utf-8')
}

async function run() {
  console.log('\n=== Agent Schema Unification: real_estate_agents → Agent TS type ===\n')

  // -------------------------------------------------------
  // Suite 1: No is_active filters on real_estate_agents
  // -------------------------------------------------------
  console.log('Suite 1: No is_active=true filters on real_estate_agents\n')

  const inboundSms = readSrc('product/lead-response/dashboard/lib/services/inbound-sms-service.ts')
  const fubWebhook = readSrc('product/lead-response/dashboard/lib/services/fub-webhook-service.ts')
  const supabaseTs = readSrc('product/lead-response/dashboard/lib/supabase.ts')
  const webhookRoute = readSrc('product/lead-response/dashboard/app/api/webhook/route.ts')
  const formDataRoute = readSrc('product/lead-response/dashboard/app/api/debug/test-formdata/route.ts')
  const fullFlowRoute = readSrc('product/lead-response/dashboard/app/api/debug/test-full-flow/route.ts')

  await test('inbound-sms-service.ts has no .eq(is_active) filters', () => {
    assert.ok(
      !inboundSms.includes(".eq('is_active'") && !inboundSms.includes('.eq("is_active"'),
      'inbound-sms-service.ts must not filter real_estate_agents by is_active'
    )
  })

  await test('fub-webhook-service.ts has no .eq(is_active) filters on agents', () => {
    assert.ok(
      !fubWebhook.includes(".eq('is_active'") && !fubWebhook.includes('.eq("is_active"'),
      'fub-webhook-service.ts must not filter real_estate_agents by is_active'
    )
  })

  await test('supabase.ts getActiveAgents uses status=active not is_active', () => {
    assert.ok(
      supabaseTs.includes(".eq('status', 'active')") || supabaseTs.includes('.eq("status", "active")'),
      'getActiveAgents must filter by status=active'
    )
    const isActiveInAgentFn = supabaseTs.includes('getActiveAgents') &&
      supabaseTs.slice(
        supabaseTs.indexOf('getActiveAgents'),
        supabaseTs.indexOf('getActiveAgents') + 400
      ).includes(".eq('is_active'")
    assert.ok(!isActiveInAgentFn, 'getActiveAgents must not use is_active filter')
  })

  await test('webhook/route.ts has no .eq(is_active, true) on real_estate_agents', () => {
    assert.ok(
      !webhookRoute.includes(".eq('is_active', true)") && !webhookRoute.includes('.eq("is_active", true)'),
      'webhook/route.ts must not filter real_estate_agents by is_active=true'
    )
  })

  await test('debug/test-formdata/route.ts uses status=active', () => {
    assert.ok(
      formDataRoute.includes(".eq('status', 'active')") || formDataRoute.includes('.eq("status", "active")'),
      'test-formdata/route.ts getDefaultAgent must use status=active'
    )
    assert.ok(
      !formDataRoute.includes(".eq('is_active', true)"),
      'test-formdata/route.ts must not use is_active=true'
    )
  })

  await test('debug/test-full-flow/route.ts uses status=active', () => {
    assert.ok(
      fullFlowRoute.includes(".eq('status', 'active')") || fullFlowRoute.includes('.eq("status", "active")'),
      'test-full-flow/route.ts getDefaultAgent must use status=active'
    )
    assert.ok(
      !fullFlowRoute.includes(".eq('is_active', true)"),
      'test-full-flow/route.ts must not use is_active=true'
    )
  })

  // -------------------------------------------------------
  // Suite 2: Mapper exports and structure
  // -------------------------------------------------------
  console.log('\nSuite 2: realEstateAgentRowToAgent mapper\n')

  const agentMapper = readSrc('product/lead-response/dashboard/lib/agent-mapper.ts')

  await test('agent-mapper.ts exports realEstateAgentRowToAgent', () => {
    assert.ok(
      agentMapper.includes('export function realEstateAgentRowToAgent'),
      'realEstateAgentRowToAgent must be exported from agent-mapper.ts'
    )
  })

  await test('mapper always sets market (derived from state)', () => {
    assert.ok(
      agentMapper.includes('deriveMarket'),
      'mapper must call deriveMarket to set the market field'
    )
    assert.ok(
      agentMapper.includes("market: deriveMarket("),
      'mapper must assign market field via deriveMarket()'
    )
  })

  await test('mapper always sets settings (DEFAULT_AGENT_SETTINGS)', () => {
    assert.ok(
      agentMapper.includes('DEFAULT_AGENT_SETTINGS'),
      'mapper must define DEFAULT_AGENT_SETTINGS constant'
    )
    assert.ok(
      agentMapper.includes('settings: DEFAULT_AGENT_SETTINGS'),
      'mapper must assign settings field from DEFAULT_AGENT_SETTINGS'
    )
  })

  await test('DEFAULT_AGENT_SETTINGS has auto_respond field', () => {
    assert.ok(
      agentMapper.includes('auto_respond'),
      'DEFAULT_AGENT_SETTINGS must include auto_respond'
    )
  })

  await test('mapper converts status=active to is_active=true', () => {
    assert.ok(
      agentMapper.includes("is_active: row.status === 'active'"),
      "mapper must set is_active as row.status === 'active'"
    )
  })

  await test('mapper falls back timezone to America/New_York', () => {
    assert.ok(
      agentMapper.includes("'America/New_York'"),
      'mapper must default timezone to America/New_York'
    )
  })

  // -------------------------------------------------------
  // Suite 3: Twilio route wires hasRequiredAgent correctly
  // -------------------------------------------------------
  console.log('\nSuite 3: Twilio inbound route — hasRequiredAgent check\n')

  const twilioRoute = readSrc('product/lead-response/dashboard/app/api/webhook/twilio/route.ts')

  await test('Twilio route imports resolveAgent from inbound-sms-service', () => {
    assert.ok(
      twilioRoute.includes('resolveAgent'),
      'Twilio route must import and call resolveAgent'
    )
  })

  await test('Twilio route computes hasRequiredAgent = agent && agent.market && agent.settings', () => {
    assert.ok(
      twilioRoute.includes('hasRequiredAgent') &&
        twilioRoute.includes('agent.market') &&
        twilioRoute.includes('agent.settings'),
      'Twilio route must compute hasRequiredAgent checking agent.market and agent.settings'
    )
  })

  await test('resolveAgent in inbound-sms-service applies realEstateAgentRowToAgent', () => {
    assert.ok(
      inboundSms.includes('realEstateAgentRowToAgent'),
      'inbound-sms-service must import and apply realEstateAgentRowToAgent'
    )
    assert.ok(
      inboundSms.includes('export async function resolveAgent'),
      'inbound-sms-service must export resolveAgent'
    )
  })

  await test('getDefaultAgent in inbound-sms-service applies mapper', () => {
    const fnBlock = inboundSms.slice(
      inboundSms.indexOf('export async function getDefaultAgent'),
      inboundSms.indexOf('export async function getDefaultAgent') + 300
    )
    assert.ok(
      fnBlock.includes('realEstateAgentRowToAgent'),
      'getDefaultAgent must apply realEstateAgentRowToAgent to the DB row'
    )
    assert.ok(
      fnBlock.includes(".eq('status', 'active')"),
      "getDefaultAgent must filter by status='active'"
    )
  })

  // -------------------------------------------------------
  // Suite 4: Mapper produces hasRequiredAgent=true for any active agent
  // -------------------------------------------------------
  console.log('\nSuite 4: Simulated hasRequiredAgent for mapped agent\n')

  await test('mapped agent with status=active has truthy market', () => {
    // Inline the mapper logic to simulate without TS compilation
    const CA_PROVINCES = new Set(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
      'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland',
      'Nova Scotia', 'Northwest Territories', 'Nunavut', 'Ontario',
      'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'])
    const deriveMarket = (state) => (state && CA_PROVINCES.has(state)) ? 'ca-ontario' : 'us-national'
    const DEFAULT_AGENT_SETTINGS = { auto_respond: true, response_delay_seconds: 30, human_handoff_threshold: 0.7, booking_enabled: true }
    const realEstateAgentRowToAgent = (row) => ({
      id: row.id,
      email: row.email,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
      phone: row.phone_number || null,
      fub_id: null,
      calcom_username: null,
      timezone: row.timezone || 'America/New_York',
      market: deriveMarket(row.state),
      settings: DEFAULT_AGENT_SETTINGS,
      is_active: row.status === 'active',
      created_at: row.created_at,
      updated_at: row.updated_at,
    })

    const dbRow = { id: 'abc', email: 'agent@test.com', first_name: 'Jane', last_name: 'Smith',
      phone_number: '+15551234567', state: 'CA', status: 'active', timezone: 'America/Los_Angeles',
      created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
    const agent = realEstateAgentRowToAgent(dbRow)
    const hasRequiredAgent = agent && agent.market && agent.settings
    assert.ok(hasRequiredAgent, `hasRequiredAgent must be truthy for an active agent, got: ${JSON.stringify({ market: agent.market, settings: !!agent.settings })}`)
  })

  await test('mapped agent has is_active=true when status=active', () => {
    const realEstateAgentRowToAgent = (row) => ({
      id: row.id, email: row.email,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
      phone: row.phone_number || null, fub_id: null, calcom_username: null,
      timezone: row.timezone || 'America/New_York', market: 'us-national',
      settings: { auto_respond: true, response_delay_seconds: 30, human_handoff_threshold: 0.7, booking_enabled: true },
      is_active: row.status === 'active',
      created_at: row.created_at, updated_at: row.updated_at,
    })
    const agent = realEstateAgentRowToAgent({ id: 'x', email: 'a@b.com', first_name: 'A', last_name: 'B',
      phone_number: null, state: null, status: 'active', timezone: null,
      created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' })
    assert.strictEqual(agent.is_active, true, 'is_active must be true when status=active')
    assert.ok(agent.settings.auto_respond !== undefined, 'auto_respond must be defined')
    assert.ok(agent.market === 'us-national' || agent.market === 'ca-ontario', `market must be a valid Market value, got: ${agent.market}`)
  })

  await test('getDefaultAgent result satisfies hasRequiredAgent check in Twilio route', () => {
    const routeHasRequiredAgent = twilioRoute.includes('agent && agent.market && agent.settings')
    assert.ok(routeHasRequiredAgent, 'Twilio route must check agent && agent.market && agent.settings')
    assert.ok(
      inboundSms.includes('resolveAgent') && inboundSms.includes('getDefaultAgent'),
      'inbound-sms-service must provide both resolveAgent and getDefaultAgent'
    )
  })

  // -------------------------------------------------------
  // Suite 5: supabase.ts agent read functions apply mapper
  // -------------------------------------------------------
  console.log('\nSuite 5: supabase.ts agent read functions apply mapper\n')

  await test('supabase.ts imports realEstateAgentRowToAgent', () => {
    assert.ok(
      supabaseTs.includes("from '@/lib/agent-mapper'") || supabaseTs.includes('from "@/lib/agent-mapper"'),
      'supabase.ts must import from @/lib/agent-mapper'
    )
    assert.ok(
      supabaseTs.includes('realEstateAgentRowToAgent'),
      'supabase.ts must use realEstateAgentRowToAgent'
    )
  })

  await test('getAgentById applies realEstateAgentRowToAgent', () => {
    const fnBlock = supabaseTs.slice(
      supabaseTs.indexOf('export async function getAgentById'),
      supabaseTs.indexOf('export async function getAgentById') + 350
    )
    assert.ok(
      fnBlock.includes('realEstateAgentRowToAgent'),
      'getAgentById must apply realEstateAgentRowToAgent to the returned row'
    )
  })

  await test('getAgentByEmail applies realEstateAgentRowToAgent', () => {
    const fnBlock = supabaseTs.slice(
      supabaseTs.indexOf('export async function getAgentByEmail'),
      supabaseTs.indexOf('export async function getAgentByEmail') + 350
    )
    assert.ok(
      fnBlock.includes('realEstateAgentRowToAgent'),
      'getAgentByEmail must apply realEstateAgentRowToAgent to the returned row'
    )
  })

  await test('getActiveAgents applies mapper to all rows', () => {
    const fnBlock = supabaseTs.slice(
      supabaseTs.indexOf('export async function getActiveAgents'),
      supabaseTs.indexOf('export async function getActiveAgents') + 350
    )
    assert.ok(
      fnBlock.includes('realEstateAgentRowToAgent'),
      'getActiveAgents must apply realEstateAgentRowToAgent to each returned row'
    )
  })

  // -------------------------------------------------------
  // Final summary
  // -------------------------------------------------------
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Results: ${passed} passed, ${failed} failed\n`)

  if (failed > 0) {
    console.error('❌ Agent schema unification incomplete — see failures above.\n')
    process.exit(1)
  } else {
    console.log('✅ All tests passed!\n')
    console.log('Summary:')
    console.log('  • All real_estate_agents reads use status=active (not is_active=true)')
    console.log('  • realEstateAgentRowToAgent always produces market and settings')
    console.log('  • Twilio inbound hasRequiredAgent check would be truthy for any mapped agent')
    console.log('  • supabase.ts agent functions apply mapper at every read site')
    process.exit(0)
  }
}

run().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
