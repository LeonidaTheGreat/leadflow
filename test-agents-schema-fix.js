#!/usr/bin/env node
/**
 * QC Test: Agents Table Schema Collision Fix
 * 
 * Tests:
 * 1. real_estate_agents table exists
 * 2. Migration created all required tables
 * 3. API routes reference correct table
 * 4. check-email route uses real_estate_agents
 * 5. onboard route uses real_estate_agents
 * 6. Stripe webhook uses real_estate_agents
 * 7. No remaining references to old agents table in critical paths
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let passCount = 0;
let failCount = 0;

function pass(msg) {
  console.log(`✅ ${msg}`);
  passCount++;
}

function fail(msg) {
  console.log(`❌ ${msg}`);
  failCount++;
}

function check(condition, msg) {
  if (condition) {
    pass(msg);
  } else {
    fail(msg);
  }
}

async function checkDatabase() {
  console.log('\n🔍 DATABASE SCHEMA CHECKS\n');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    fail('Supabase credentials not configured');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Check if real_estate_agents table exists
  try {
    const { data, error } = await supabase
      .from('real_estate_agents')
      .select('*')
      .limit(1);
    
    check(!error, 'real_estate_agents table exists');
  } catch (e) {
    fail(`real_estate_agents table does not exist: ${e.message}`);
  }

  // Check if agent_integrations table exists
  try {
    const { data, error } = await supabase
      .from('agent_integrations')
      .select('*')
      .limit(1);
    
    check(!error, 'agent_integrations table exists');
  } catch (e) {
    fail(`agent_integrations table does not exist: ${e.message}`);
  }

  // Check if agent_settings table exists
  try {
    const { data, error } = await supabase
      .from('agent_settings')
      .select('*')
      .limit(1);
    
    check(!error, 'agent_settings table exists');
  } catch (e) {
    fail(`agent_settings table does not exist: ${e.message}`);
  }

  // Check subscription_attempts table (used by create-checkout)
  try {
    const { data, error } = await supabase
      .from('subscription_attempts')
      .select('*')
      .limit(1);
    
    check(!error, 'subscription_attempts table exists');
  } catch (e) {
    fail(`subscription_attempts table does not exist: ${e.message}`);
  }

  // Check subscription_events table (used by stripe webhook)
  try {
    const { data, error } = await supabase
      .from('subscription_events')
      .select('*')
      .limit(1);
    
    check(!error, 'subscription_events table exists');
  } catch (e) {
    fail(`subscription_events table does not exist: ${e.message}`);
  }

  // Check payments table (used by stripe webhook)
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .limit(1);
    
    check(!error, 'payments table exists');
  } catch (e) {
    fail(`payments table does not exist: ${e.message}`);
  }
}

function checkCodeReferences() {
  console.log('\n🔍 CODE REFERENCE CHECKS\n');
  
  const apiDir = path.join(__dirname, 'product/lead-response/dashboard/app/api');
  const criticalRoutes = [
    'agents/onboard/route.ts',
    'agents/create/route.ts',
    'agents/check-email/route.ts',
    'agents/profile/route.ts',
    'auth/login/route.ts',
    'billing/create-checkout/route.ts',
    'webhooks/stripe/route.ts',
    'webhook/twilio/route.ts',
    'webhook/fub/route.ts',
  ];

  const issues = [];

  for (const route of criticalRoutes) {
    const filePath = path.join(apiDir, route);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  SKIP: ${route} - file not found`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const usesRealEstateAgents = content.includes("from('real_estate_agents')") ||
                                  content.includes('from("real_estate_agents")');
    const usesOldAgents = content.includes("from('agents')") ||
                          content.includes('from("agents")');

    // Special cases: some routes might be intentionally using old table
    const isExempt = false; // None should be exempt

    if (isExempt) {
      console.log(`✅ ${route} - exempted`);
    } else if (usesRealEstateAgents && !usesOldAgents) {
      pass(`${route} - uses real_estate_agents`);
    } else if (usesOldAgents) {
      fail(`${route} - STILL USES OLD 'agents' TABLE`);
      issues.push(route);
    } else {
      // Might be a read-only or data fetching route
      console.log(`⚠️  ${route} - no table reference found`);
    }
  }

  if (issues.length > 0) {
    console.log(`\n⚠️  CRITICAL: ${issues.length} routes not migrated:`);
    issues.forEach(r => console.log(`   - ${r}`));
  }
}

function checkMigration() {
  console.log('\n🔍 MIGRATION FILE CHECKS\n');
  
  const migrationPath = path.join(__dirname, 'supabase/migrations/013_fix_agents_schema_collision.sql');
  
  if (!fs.existsSync(migrationPath)) {
    fail('Migration file 013_fix_agents_schema_collision.sql not found');
    return;
  }

  pass('Migration file exists');

  const content = fs.readFileSync(migrationPath, 'utf8');
  
  check(
    content.includes('CREATE TABLE IF NOT EXISTS real_estate_agents'),
    'Migration creates real_estate_agents table'
  );
  
  check(
    content.includes('CREATE TABLE IF NOT EXISTS agent_integrations'),
    'Migration creates agent_integrations table'
  );
  
  check(
    content.includes('CREATE TABLE IF NOT EXISTS agent_settings'),
    'Migration creates agent_settings table'
  );
  
  check(
    content.includes('ENABLE ROW LEVEL SECURITY'),
    'Migration enables RLS'
  );
  
  check(
    content.includes('INSERT INTO real_estate_agents'),
    'Migration includes data migration'
  );
}

async function run() {
  console.log('=======================================');
  console.log('  AGENTS SCHEMA COLLISION FIX - QC TEST');
  console.log('=======================================');

  checkMigration();
  checkCodeReferences();
  await checkDatabase();

  console.log('\n=======================================');
  console.log('  TEST SUMMARY');
  console.log('=======================================');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Pass Rate: ${Math.round(100 * passCount / (passCount + failCount))}%`);
  
  if (failCount === 0) {
    console.log('\n✅ ALL CHECKS PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ CHECKS FAILED - FIX REQUIRED');
    process.exit(1);
  }
}

run().catch(console.error);
