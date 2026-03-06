#!/usr/bin/env node

/**
 * Check if the schema collision fix has been applied
 * This verifies if real_estate_agents table exists in the database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkTableStatus() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log('🔍 Checking database schema...\n');

  // Check for real_estate_agents table
  console.log('1️⃣  Checking real_estate_agents table:');
  const { data: reaResult, error: reaError } = await supabase
    .from('real_estate_agents')
    .select('*')
    .limit(1);

  if (reaError && reaError.code === 'PGRST116') {
    console.log('   ❌ DOES NOT EXIST');
    console.log(`   Error: ${reaError.message}`);
  } else if (reaError) {
    console.log(`   ⚠️  Got error: ${reaError.message}`);
  } else {
    console.log('   ✅ EXISTS');
    if (reaResult) {
      console.log(`   Found ${reaResult.length || 0} records`);
    }
  }

  // Check for orchestrator agents table (should have different structure)
  console.log('\n2️⃣  Checking orchestrator agents table:');
  const { data: agentsResult, error: agentsError } = await supabase
    .from('agents')
    .select('*')
    .limit(1);

  if (agentsError && agentsError.code === 'PGRST116') {
    console.log('   ❌ DOES NOT EXIST');
  } else if (agentsError) {
    console.log(`   ⚠️  Got error: ${agentsError.message}`);
  } else {
    console.log('   ✅ EXISTS');
    if (agentsResult && agentsResult.length > 0) {
      const sample = agentsResult[0];
      const columns = Object.keys(sample);
      console.log(`   Found ${agentsResult.length} records`);
      console.log(`   Columns: ${columns.join(', ')}`);
    }
  }

  // Check for agent_integrations table
  console.log('\n3️⃣  Checking agent_integrations table:');
  const { data: intResult, error: intError } = await supabase
    .from('agent_integrations')
    .select('*')
    .limit(1);

  if (intError && intError.code === 'PGRST116') {
    console.log('   ❌ DOES NOT EXIST');
  } else if (intError) {
    console.log(`   ⚠️  Got error: ${intError.message}`);
  } else {
    console.log('   ✅ EXISTS');
  }

  // Check for agent_settings table
  console.log('\n4️⃣  Checking agent_settings table:');
  const { data: setResult, error: setError } = await supabase
    .from('agent_settings')
    .select('*')
    .limit(1);

  if (setError && setError.code === 'PGRST116') {
    console.log('   ❌ DOES NOT EXIST');
  } else if (setError) {
    console.log(`   ⚠️  Got error: ${setError.message}`);
  } else {
    console.log('   ✅ EXISTS');
  }

  console.log('\n📊 Summary:');
  const reaExists = !reaError || reaError.code !== 'PGRST116';
  const agentsExists = !agentsError || agentsError.code !== 'PGRST116';
  const intExists = !intError || intError.code !== 'PGRST116';
  const setExists = !setError || setError.code !== 'PGRST116';

  if (reaExists && agentsExists && intExists && setExists) {
    console.log('✅ Migration appears to be APPLIED');
  } else {
    console.log('❌ Migration appears to be NOT APPLIED');
    console.log('\n🔧 To apply the migration:');
    console.log('   1. Install Supabase CLI: npm install -g supabase');
    console.log('   2. Navigate to: cd product/lead-response/dashboard');
    console.log('   3. Run: npx supabase db push');
  }
}

checkTableStatus().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
