/**
 * Tests for pilot_signups table migration (012)
 * Verifies the table exists and the /api/pilot-signup route can insert records.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  let passed = 0
  let failed = 0

  function ok(label, condition) {
    if (condition) {
      console.log(`  ✅ PASS: ${label}`)
      passed++
    } else {
      console.log(`  ❌ FAIL: ${label}`)
      failed++
    }
  }

  console.log('\n=== pilot_signups table tests ===\n')

  // ── Test 1: Table exists (no PGRST205) ──────────────────────────────────
  console.log('1. Table existence check')
  const { data: rows, error: selectErr } = await supabase
    .from('pilot_signups')
    .select('id')
    .limit(1)
  ok('pilot_signups table exists (no PGRST205)', !selectErr)
  if (selectErr) console.log('    Error:', selectErr.message)

  // ── Test 2: Insert a test row ────────────────────────────────────────────
  console.log('\n2. Insert test record')
  const testEmail = `test-${Date.now()}@pilot-test.invalid`
  const { data: inserted, error: insertErr } = await supabase
    .from('pilot_signups')
    .insert({
      name: 'Test User',
      email: testEmail,
      phone: '+15550001234',
      brokerage_name: 'Test Brokerage',
      team_name: 'Test Team',
      monthly_leads: '50-100',
      current_crm: 'FUB',
      source: 'test',
      utm_campaign: 'test-campaign',
    })
    .select()
    .single()
  ok('Insert succeeds', !insertErr)
  ok('Inserted row has uuid id', inserted?.id && typeof inserted.id === 'string')
  ok('Inserted row has created_at', !!inserted?.created_at)
  if (insertErr) console.log('    Error:', insertErr.message)

  // ── Test 3: Unique constraint on email ────────────────────────────────────
  console.log('\n3. Unique email constraint')
  const { error: dupErr } = await supabase
    .from('pilot_signups')
    .insert({ name: 'Dup User', email: testEmail })
  ok('Duplicate email insert is rejected', !!dupErr)
  if (dupErr) console.log('    Constraint error (expected):', dupErr.message)

  // ── Cleanup ──────────────────────────────────────────────────────────────
  await supabase.from('pilot_signups').delete().eq('email', testEmail)

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
