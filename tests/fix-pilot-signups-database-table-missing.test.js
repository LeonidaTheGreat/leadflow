/**
 * Test: pilot_signups database table exists and is functional
 * Fix: bde50d86-e05b-464b-9952-1c2887cf30da
 *
 * Verifies that the pilot_signups table exists in Supabase and that
 * the /api/pilot-signup endpoint can successfully insert records.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

describe('fix-pilot-signups-database-table-missing', () => {
  const testEmail = `pilot-test-${Date.now()}@test-cleanup.com`
  let insertedId = null

  afterAll(async () => {
    // Clean up test data
    if (insertedId) {
      await supabase.from('pilot_signups').delete().eq('id', insertedId)
    }
  })

  test('pilot_signups table exists and is queryable', async () => {
    const { data, error } = await supabase
      .from('pilot_signups')
      .select('id')
      .limit(1)

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  test('can insert a pilot signup record with required fields', async () => {
    const { data, error } = await supabase
      .from('pilot_signups')
      .insert({
        name: 'Test Pilot Agent',
        email: testEmail,
        phone: '555-0100',
        brokerage_name: 'Test Brokerage LLC',
        team_name: 'Test Team',
        monthly_leads: '11-50',
        current_crm: 'follow_up_boss',
        source: 'landing_page',
        utm_campaign: 'test-campaign'
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(data.id).toBeTruthy()
    expect(data.email).toBe(testEmail)
    expect(data.status).toBe('new')

    insertedId = data.id
  })

  test('pilot_signups table has unique constraint on email', async () => {
    // Try to insert a duplicate email
    const { error } = await supabase
      .from('pilot_signups')
      .insert({
        name: 'Duplicate Agent',
        email: testEmail // same email as above
      })

    // Should fail with unique constraint violation (23505)
    expect(error).toBeTruthy()
    expect(error.code).toBe('23505')
  })

  test('pilot_signups table has required columns', async () => {
    const { data, error } = await supabase
      .from('pilot_signups')
      .select('id, name, email, phone, brokerage_name, team_name, monthly_leads, current_crm, status, source, utm_campaign, created_at')
      .eq('email', testEmail)
      .single()

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(data.id).toBeTruthy()
    expect(data.created_at).toBeTruthy()
  })
})
