/**
 * pilot_signups Table — Integration Test
 *
 * Verifies that:
 *  1. The pilot_signups table exists in Supabase
 *  2. Rows can be inserted with all expected columns
 *  3. The unique constraint on email works (code 23505)
 *  4. All columns from the /api/pilot-signup route are accepted
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const testResults = { passed: 0, failed: 0, tests: [] };

async function runTest(name, fn) {
  try {
    await fn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASSED' });
    console.log(`✅ ${name}`);
  } catch (err) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAILED', error: err.message });
    console.error(`❌ ${name}: ${err.message}`);
  }
}

const TEST_EMAIL = `pilot-signup-test-${Date.now()}@example.com`;

async function main() {
  console.log('\n=== pilot_signups Table Integration Tests ===\n');

  if (!supabaseUrl || !supabaseKey) {
    console.error('FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  // ── Test 1: Table exists (can select with 0 rows) ───────────────────────────
  await runTest('pilot_signups table exists', async () => {
    const { error } = await sb.from('pilot_signups').select('id').limit(1);
    assert.strictEqual(error, null, `Table select failed: ${error?.message}`);
  });

  // ── Test 2: Insert with all expected columns ─────────────────────────────────
  let insertedId;
  await runTest('Insert row with all expected columns', async () => {
    const { data, error } = await sb
      .from('pilot_signups')
      .insert({
        name:           'Test Agent',
        email:          TEST_EMAIL,
        phone:          '555-000-0000',
        brokerage_name: 'Test Brokerage',
        team_name:      'Test Team',
        monthly_leads:  '11-50',
        current_crm:    'follow_up_boss',
        source:         'landing_page',
        utm_campaign:   'test-campaign',
      })
      .select()
      .single();

    assert.strictEqual(error, null, `Insert failed: ${error?.message}`);
    assert.ok(data.id, 'Returned row must have an id (uuid)');
    assert.ok(data.created_at, 'Returned row must have created_at');
    insertedId = data.id;
  });

  // ── Test 3: Unique constraint on email ──────────────────────────────────────
  await runTest('Unique email constraint blocks duplicate (error code 23505)', async () => {
    const { error } = await sb
      .from('pilot_signups')
      .insert({ name: 'Duplicate', email: TEST_EMAIL });

    assert.ok(error, 'Expected an error on duplicate email');
    assert.strictEqual(
      error.code, '23505',
      `Expected unique-violation code 23505, got: ${error.code} — ${error.message}`
    );
  });

  // ── Test 4: name and email are required ─────────────────────────────────────
  await runTest('Insert without required name field is rejected', async () => {
    const { error } = await sb
      .from('pilot_signups')
      .insert({ email: `no-name-${Date.now()}@example.com` });

    // name column has NOT NULL — Supabase returns a 400-level pg error
    assert.ok(error, 'Expected an error when name is missing');
  });

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  if (insertedId) {
    await sb.from('pilot_signups').delete().eq('id', insertedId);
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  const total = testResults.passed + testResults.failed;
  console.log(`\n=== Results: ${testResults.passed}/${total} passed ===`);
  if (testResults.failed > 0) {
    testResults.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => console.error(`  FAIL: ${t.name} — ${t.error}`));
    process.exit(1);
  }

  return testResults;
}

module.exports = { main, testResults };

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
