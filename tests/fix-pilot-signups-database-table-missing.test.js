/**
 * Tests for fix-pilot-signups-database-table-missing
 *
 * Verifies that the pilot_signups table exists in Supabase with the correct
 * schema, unique constraint on email, and that the /api/pilot-signup route
 * can insert records without PGRST205 errors.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabase

// Test result tracking
const results = { passed: 0, failed: 0, total: 0 }

function test(name, fn) {
  results.total++
  return fn().then(() => {
    console.log(`  ✅ ${name}`)
    results.passed++
  }).catch(err => {
    console.log(`  ❌ ${name}: ${err.message}`)
    results.failed++
  })
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed')
}

async function cleanup(email) {
  await supabase.from('pilot_signups').delete().eq('email', email)
}

async function runTests() {
  console.log('\n=== pilot_signups table tests ===\n')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  supabase = createClient(supabaseUrl, supabaseKey)

  // Test 1: Table exists and is queryable (no PGRST205)
  await test('pilot_signups table exists and is queryable', async () => {
    const { error } = await supabase.from('pilot_signups').select('id').limit(1)
    assert(!error, `Table query failed: ${error?.message} (code: ${error?.code})`)
  })

  const testEmail = `test-pilot-${Date.now()}@example.com`

  // Test 2: Can insert a pilot signup record
  await test('Can insert a pilot signup record', async () => {
    await cleanup(testEmail)
    const { data, error } = await supabase.from('pilot_signups').insert({
      name: 'Test Agent',
      email: testEmail,
      phone: '+14165550001',
      brokerage_name: 'Test Brokerage',
      team_name: 'Test Team',
      monthly_leads: '11-50',
      current_crm: 'follow_up_boss',
      source: 'landing_page',
      utm_campaign: 'test-campaign'
    }).select().single()

    assert(!error, `Insert failed: ${error?.message}`)
    assert(data.id, 'Record should have an id (uuid)')
    assert(data.email === testEmail, 'Email should match')
    assert(data.created_at, 'created_at should be set')
    await cleanup(testEmail)
  })

  // Test 3: Unique constraint on email prevents duplicate signups
  await test('Unique constraint on email prevents duplicates', async () => {
    await cleanup(testEmail)

    // First insert should succeed
    const { error: err1 } = await supabase.from('pilot_signups').insert({
      name: 'First Signup',
      email: testEmail
    })
    assert(!err1, `First insert failed: ${err1?.message}`)

    // Second insert with same email should fail
    const { error: err2 } = await supabase.from('pilot_signups').insert({
      name: 'Duplicate Signup',
      email: testEmail
    })
    assert(err2, 'Second insert should fail due to unique constraint')
    assert(
      err2.code === '23505' || err2.message.includes('unique') || err2.message.includes('duplicate'),
      `Expected unique violation, got: ${err2.code} ${err2.message}`
    )
    await cleanup(testEmail)
  })

  // Test 4: Required columns are enforced (name cannot be null)
  await test('Required field (name) is enforced', async () => {
    const { error } = await supabase.from('pilot_signups').insert({
      email: `no-name-${Date.now()}@example.com`
      // name is intentionally omitted — should fail NOT NULL constraint
    })
    assert(error, 'Insert without name should fail')
    assert(
      error.code === '23502' || error.message.includes('null') || error.message.includes('violates'),
      `Expected not-null violation, got: ${error.code} ${error.message}`
    )
  })

  console.log(`\n=== Results: ${results.passed}/${results.total} passed ===\n`)

  if (results.failed > 0) {
    process.exit(1)
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
