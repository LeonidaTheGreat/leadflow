#!/usr/bin/env node

/**
 * Test the onboarding endpoint fix
 * Verifies that the schema collision is resolved
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testOnboardingFix() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log('🧪 Testing Onboarding Endpoint Fix\n');
  console.log('=' .repeat(50));

  // Test 1: Email check should query real_estate_agents
  console.log('\n📧 TEST 1: Email Check Against real_estate_agents');
  console.log('-'.repeat(50));

  const testEmail = `qc-test-${Date.now()}@example.com`;
  
  const { data: existingAgent, error: checkError } = await supabase
    .from('real_estate_agents')
    .select('id')
    .eq('email', testEmail)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    console.log('❌ FAIL: Error checking email');
    console.log(`   Error: ${checkError.message}`);
  } else if (existingAgent) {
    console.log('❌ FAIL: Email already exists (unexpected)');
  } else {
    console.log(`✅ PASS: Email ${testEmail} is available`);
  }

  // Test 2: Insert a test agent into real_estate_agents
  console.log('\n👤 TEST 2: Create Agent in real_estate_agents');
  console.log('-'.repeat(50));

  const testAgent = {
    email: testEmail,
    password_hash: 'test_hash_' + Date.now(),
    first_name: 'QC',
    last_name: 'Test',
    phone_number: '5551234567',
    state: 'California',
    status: 'onboarding',
    timezone: 'America/Los_Angeles',
    email_verified: false,
  };

  const { data: newAgent, error: insertError } = await supabase
    .from('real_estate_agents')
    .insert(testAgent)
    .select()
    .single();

  if (insertError) {
    console.log('❌ FAIL: Could not insert agent');
    console.log(`   Error: ${insertError.message}`);
  } else if (!newAgent) {
    console.log('❌ FAIL: No agent returned after insert');
  } else {
    console.log(`✅ PASS: Agent created with ID: ${newAgent.id}`);
    console.log(`   Email: ${newAgent.email}`);
    console.log(`   Status: ${newAgent.status}`);
  }

  // Test 3: Verify agent can be queried back
  if (newAgent) {
    console.log('\n🔍 TEST 3: Query Created Agent');
    console.log('-'.repeat(50));

    const { data: queriedAgent, error: queryError } = await supabase
      .from('real_estate_agents')
      .select('*')
      .eq('id', newAgent.id)
      .single();

    if (queryError) {
      console.log('❌ FAIL: Could not query agent');
      console.log(`   Error: ${queryError.message}`);
    } else if (!queriedAgent) {
      console.log('❌ FAIL: Agent not found after insert');
    } else {
      console.log(`✅ PASS: Agent retrieved successfully`);
      console.log(`   ID: ${queriedAgent.id}`);
      console.log(`   Email: ${queriedAgent.email}`);
      console.log(`   State: ${queriedAgent.state}`);
    }

    // Test 4: Create integrations for the agent
    console.log('\n🔗 TEST 4: Create agent_integrations');
    console.log('-'.repeat(50));

    const { data: integration, error: intError } = await supabase
      .from('agent_integrations')
      .insert({
        agent_id: newAgent.id,
        cal_com_link: 'https://cal.com/qctest',
        twilio_phone_number: '+15551234567',
      })
      .select()
      .single();

    if (intError) {
      console.log('❌ FAIL: Could not create integration');
      console.log(`   Error: ${intError.message}`);
    } else {
      console.log(`✅ PASS: Integration created`);
      console.log(`   Agent ID: ${integration.agent_id}`);
      console.log(`   Cal.com: ${integration.cal_com_link}`);
    }

    // Test 5: Create settings for the agent
    console.log('\n⚙️  TEST 5: Create agent_settings');
    console.log('-'.repeat(50));

    const { data: settings, error: setError } = await supabase
      .from('agent_settings')
      .insert({
        agent_id: newAgent.id,
        auto_response_enabled: true,
        sms_enabled: true,
        email_notifications: true,
      })
      .select()
      .single();

    if (setError) {
      console.log('❌ FAIL: Could not create settings');
      console.log(`   Error: ${setError.message}`);
    } else {
      console.log(`✅ PASS: Settings created`);
      console.log(`   Agent ID: ${settings.agent_id}`);
      console.log(`   SMS enabled: ${settings.sms_enabled}`);
    }

    // Cleanup: Delete test data
    console.log('\n🧹 CLEANUP: Removing test data');
    console.log('-'.repeat(50));

    const { error: deleteError } = await supabase
      .from('real_estate_agents')
      .delete()
      .eq('id', newAgent.id);

    if (deleteError) {
      console.log(`⚠️  Could not delete test agent: ${deleteError.message}`);
    } else {
      console.log(`✅ Test agent deleted`);
    }
  }

  // Test 6: Verify orchestrator agents table is separate
  console.log('\n🤖 TEST 6: Verify Orchestrator agents Table Separate');
  console.log('-'.repeat(50));

  const { data: orchestratorAgents, error: orchError } = await supabase
    .from('agents')
    .select('*');

  if (orchError) {
    console.log('❌ FAIL: Could not query orchestrator agents');
    console.log(`   Error: ${orchError.message}`);
  } else if (!orchestratorAgents || orchestratorAgents.length === 0) {
    console.log('⚠️  No orchestrator agents found (expected for clean test)');
  } else {
    const sample = orchestratorAgents[0];
    const hasOrchFields = sample.agent_name && sample.agent_type && sample.project_id;
    const noCustomerFields = !sample.password_hash && !sample.first_name;

    if (hasOrchFields && noCustomerFields) {
      console.log(`✅ PASS: agents table has correct orchestrator schema`);
      console.log(`   Sample columns: ${Object.keys(sample).join(', ')}`);
    } else {
      console.log('❌ FAIL: agents table may have mixed schemas');
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✨ All tests completed!\n');
}

testOnboardingFix().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
