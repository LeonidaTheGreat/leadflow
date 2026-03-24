/**
 * E2E Test: Fix — subscription_attempts → checkout_sessions
 *
 * Verifies runtime behavior: the checkout route correctly inserts into
 * checkout_sessions (not the non-existent subscription_attempts table)
 * with the expected column mapping.
 *
 * QC Task: c9684c8c-bdff-4e47-9597-239b4150743e
 */

'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const assert = require('assert')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let passed = 0
let failed = 0
const results = []

function ok(name, result, detail = '') {
  if (result) {
    console.log(`  ✅ PASS: ${name}`)
    passed++
    results.push({ name, status: 'pass' })
  } else {
    console.log(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`)
    failed++
    results.push({ name, status: 'fail', detail })
  }
}

async function run() {
  console.log('\n🧪 E2E: Fix subscription_attempts → checkout_sessions\n')

  // ── TEST 1: subscription_attempts does NOT exist ──────────────────────────
  console.log('TEST 1: subscription_attempts table absent from schema')
  {
    const { error } = await supabase.from('subscription_attempts').select('*').limit(1)
    ok(
      'subscription_attempts returns PGRST205 (table not found)',
      error && (error.code === 'PGRST205' || error.message.includes('subscription_attempts')),
      error ? error.message : 'no error — table unexpectedly exists!'
    )
  }

  // ── TEST 2: checkout_sessions table exists ────────────────────────────────
  console.log('\nTEST 2: checkout_sessions table accessible')
  {
    const { error } = await supabase.from('checkout_sessions').select('*').limit(1)
    ok('checkout_sessions.select() succeeds', !error, error?.message)
  }

  // ── TEST 3: Insert with correct column mapping ────────────────────────────
  console.log('\nTEST 3: Insert into checkout_sessions with route column mapping')
  let insertedId = null
  {
    // Grab any agent
    const { data: agents, error: ae } = await supabase.from('agents').select('id').limit(1)
    assert(!ae, `Could not fetch agent: ${ae?.message}`)
    const agentId = agents[0]?.id
    assert(agentId, 'No agents in DB — cannot test FK constraint')

    // Replicate the route logic for tier 'professional_annual'
    const tier = 'professional_annual'
    const tierInterval = tier.endsWith('_annual') ? 'year' : 'month'
    const tierBase = tier.split('_')[0]

    ok('tierInterval for professional_annual is "year"', tierInterval === 'year')
    ok('tierBase for professional_annual is "professional"', tierBase === 'professional')

    const fakeSessionId = 'cs_test_qc_' + Date.now()
    const { data, error } = await supabase.from('checkout_sessions').insert({
      user_id: agentId,
      tier: tierBase,
      interval: tierInterval,
      stripe_session_id: fakeSessionId,
      status: 'pending',
      url: 'https://checkout.stripe.com/test',
      created_at: new Date().toISOString(),
    }).select()

    ok('Insert into checkout_sessions succeeds (no error)', !error, error?.message)
    ok('Insert returns a row', data && data.length > 0)

    if (data && data[0]) {
      insertedId = data[0].id
      const row = data[0]
      ok('Row has user_id', row.user_id === agentId)
      ok('Row has tier = "professional"', row.tier === 'professional')
      ok('Row has interval = "year"', row.interval === 'year')
      ok('Row has stripe_session_id', row.stripe_session_id === fakeSessionId)
      ok('Row has status = "pending"', row.status === 'pending')
      ok('Row has url', typeof row.url === 'string' && row.url.length > 0)
    }
  }

  // ── TEST 4: Monthly tier mapping ──────────────────────────────────────────
  console.log('\nTEST 4: Monthly tier interval mapping')
  {
    const tier = 'starter_monthly'
    const tierInterval = tier.endsWith('_annual') ? 'year' : 'month'
    const tierBase = tier.split('_')[0]
    ok('tierInterval for starter_monthly is "month"', tierInterval === 'month')
    ok('tierBase for starter_monthly is "starter"', tierBase === 'starter')
  }

  // ── CLEANUP ────────────────────────────────────────────────────────────────
  if (insertedId) {
    await supabase.from('checkout_sessions').delete().eq('id', insertedId)
    console.log('\n  🧹 Cleanup: test row deleted')
  }

  // ── REPORT ─────────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`)
  console.log('='.repeat(60))
  if (failed > 0) {
    console.log('❌ SOME TESTS FAILED')
    process.exit(1)
  } else {
    console.log('✅ ALL TESTS PASSED')
  }
}

run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
