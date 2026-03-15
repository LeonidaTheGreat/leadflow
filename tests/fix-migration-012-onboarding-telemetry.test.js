#!/usr/bin/env node

const assert = require('assert');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_DB_PASSWORD || !SUPABASE_URL) {
  console.error('FAIL: Missing SUPABASE_DB_PASSWORD or SUPABASE_URL');
  process.exit(1);
}

// Extract database reference from Supabase URL
const match = SUPABASE_URL.match(/https:\/\/(\w+)\.supabase\.co/);
if (!match) {
  console.error('FAIL: Could not extract database reference from SUPABASE_URL');
  process.exit(1);
}

const dbRef = match[1];
const connectionString = `postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${dbRef}.supabase.co:5432/postgres`;

async function runTests() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Test 1: Verify real_estate_agents columns exist
    console.log('\n[Test 1] Verifying real_estate_agents columns...');
    const columnsCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'real_estate_agents' 
      AND column_name IN ('onboarding_step', 'last_onboarding_step_update')
      ORDER BY column_name
    `);
    assert.strictEqual(columnsCheck.rowCount, 2, 'Missing onboarding columns');
    console.log('✓ onboarding_step column exists');
    console.log('✓ last_onboarding_step_update column exists');

    // Test 2: Verify onboarding_events table exists and has correct structure
    console.log('\n[Test 2] Verifying onboarding_events table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'onboarding_events'
      )
    `);
    assert(tableCheck.rows[0].exists, 'onboarding_events table does not exist');
    console.log('✓ onboarding_events table exists');

    const eventColumnsCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'onboarding_events'
      AND column_name IN ('id', 'agent_id', 'step_name', 'status', 'timestamp', 'metadata', 'created_at')
      ORDER BY column_name
    `);
    assert.strictEqual(eventColumnsCheck.rowCount, 7, 'Missing expected columns in onboarding_events');
    console.log('✓ onboarding_events has all required columns');

    // Test 3: Verify onboarding_stuck_alerts table
    console.log('\n[Test 3] Verifying onboarding_stuck_alerts table...');
    const alertTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'onboarding_stuck_alerts'
      )
    `);
    assert(alertTableCheck.rows[0].exists, 'onboarding_stuck_alerts table does not exist');
    console.log('✓ onboarding_stuck_alerts table exists');

    // Test 4: Verify views exist
    console.log('\n[Test 4] Verifying views...');
    const viewsCheck = await client.query(`
      SELECT table_name FROM information_schema.views 
      WHERE table_name IN ('funnel_real_agents', 'funnel_step_counts', 'funnel_conversion_rates')
      ORDER BY table_name
    `);
    assert.strictEqual(viewsCheck.rowCount, 3, 'Missing expected views');
    console.log('✓ funnel_real_agents view exists');
    console.log('✓ funnel_step_counts view exists');
    console.log('✓ funnel_conversion_rates view exists');

    // Test 5: Verify functions exist
    console.log('\n[Test 5] Verifying functions...');
    const functionsCheck = await client.query(`
      SELECT routine_name FROM information_schema.routines 
      WHERE routine_name IN ('is_smoke_test_account', 'get_time_at_step')
      AND routine_schema = 'public'
      ORDER BY routine_name
    `);
    assert.strictEqual(functionsCheck.rowCount, 2, 'Missing expected functions');
    console.log('✓ is_smoke_test_account() function exists');
    console.log('✓ get_time_at_step() function exists');

    // Test 6: Verify is_smoke_test_account function works correctly
    console.log('\n[Test 6] Testing is_smoke_test_account function...');
    const smokeTestCheck = await client.query(
      "SELECT is_smoke_test_account($1) as is_smoke, is_smoke_test_account($2) as is_real",
      ['smoke-test@example.com', 'real@example.com']
    );
    assert.strictEqual(smokeTestCheck.rows[0].is_smoke, true, 'smoke-test@ should be marked as smoke test');
    assert.strictEqual(smokeTestCheck.rows[0].is_real, false, 'real@ should not be marked as smoke test');
    console.log('✓ is_smoke_test_account() correctly identifies smoke test accounts');

    // Test 7: Verify you can insert into onboarding_events
    console.log('\n[Test 7] Testing event insertion...');
    const agentResult = await client.query(
      "SELECT id FROM real_estate_agents LIMIT 1"
    );
    
    if (agentResult.rowCount > 0) {
      const agentId = agentResult.rows[0].id;
      const insertCheck = await client.query(
        `INSERT INTO onboarding_events (agent_id, step_name, status, metadata)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [agentId, 'email_verified', 'completed', JSON.stringify({ test: true })]
      );
      assert(insertCheck.rows[0].id, 'Failed to insert event');
      console.log('✓ Can insert events into onboarding_events');

      // Clean up
      await client.query('DELETE FROM onboarding_events WHERE agent_id = $1', [agentId]);
    } else {
      console.log('⚠ No agents in database - skipping insertion test');
    }

    // Test 8: Verify funnel_real_agents view works
    console.log('\n[Test 8] Testing funnel_real_agents view...');
    const funnelCheck = await client.query('SELECT COUNT(*) FROM funnel_real_agents');
    assert(funnelCheck.rows && funnelCheck.rows.length > 0, 'funnel_real_agents view query failed');
    console.log(`✓ funnel_real_agents view accessible (${funnelCheck.rows[0].count} real agents)`);

    // Test 9: Verify funnel_conversion_rates view works
    console.log('\n[Test 9] Testing funnel_conversion_rates view...');
    const conversionCheck = await client.query('SELECT * FROM funnel_conversion_rates');
    assert.strictEqual(conversionCheck.rowCount, 4, `funnel_conversion_rates should have 4 transition rows, got ${conversionCheck.rowCount}`);
    console.log('✓ funnel_conversion_rates view accessible (4 transition rows)');

    // Test 10: Verify column types and constraints
    console.log('\n[Test 10] Verifying column types and constraints...');
    const onboardingStepType = await client.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'real_estate_agents' AND column_name = 'onboarding_step'
    `);
    assert(onboardingStepType.rows[0].data_type === 'integer', 'onboarding_step should be integer');
    console.log('✓ onboarding_step is integer type');

    const eventStatusConstraint = await client.query(`
      SELECT constraint_name FROM information_schema.constraint_column_usage 
      WHERE table_name = 'onboarding_events' AND column_name = 'status'
    `);
    assert(eventStatusConstraint.rowCount > 0, 'onboarding_events.status should have constraints');
    console.log('✓ onboarding_events.status has check constraint');

    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runTests();
