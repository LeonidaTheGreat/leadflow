#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_DB_PASSWORD || !SUPABASE_URL) {
  console.error('Missing SUPABASE_DB_PASSWORD or SUPABASE_URL in .env');
  process.exit(1);
}

// Extract database reference from Supabase URL
// URL format: https://fptrokacdwzlmflyczdz.supabase.co
const match = SUPABASE_URL.match(/https:\/\/(\w+)\.supabase\.co/);
if (!match) {
  console.error('Could not extract database reference from SUPABASE_URL:', SUPABASE_URL);
  process.exit(1);
}

const dbRef = match[1];
const connectionString = `postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${dbRef}.supabase.co:5432/postgres`;

// Read migration file
const migrationPath = path.join(__dirname, '../product/lead-response/dashboard/supabase/migrations/012_onboarding_completion_telemetry.sql');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

async function runMigration() {
  const client = new Client({ connectionString });
  
  try {
    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('✓ Connected');
    
    console.log('\nApplying migration 012_onboarding_completion_telemetry.sql...');
    await client.query(migrationSql);
    console.log('✓ Migration applied successfully');
    
    // Verify tables/views exist
    console.log('\nVerifying schema...');
    
    const checks = [
      { name: 'onboarding_events table', query: "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_events')" },
      { name: 'onboarding_step column', query: "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'real_estate_agents' AND column_name = 'onboarding_step')" },
      { name: 'last_onboarding_step_update column', query: "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'real_estate_agents' AND column_name = 'last_onboarding_step_update')" },
      { name: 'onboarding_stuck_alerts table', query: "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_stuck_alerts')" },
      { name: 'funnel_real_agents view', query: "SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'funnel_real_agents')" },
      { name: 'funnel_conversion_rates view', query: "SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'funnel_conversion_rates')" },
      { name: 'is_smoke_test_account function', query: "SELECT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'is_smoke_test_account')" },
      { name: 'get_time_at_step function', query: "SELECT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_time_at_step')" },
    ];
    
    let allPassed = true;
    for (const check of checks) {
      const result = await client.query(check.query);
      const exists = result.rows[0].exists;
      const status = exists ? '✓' : '✗';
      console.log(`${status} ${check.name}`);
      if (!exists) allPassed = false;
    }
    
    if (allPassed) {
      console.log('\n✅ All schema objects verified successfully!');
      process.exit(0);
    } else {
      console.error('\n❌ Some schema objects are missing!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
