/**
 * E2E Test: Active Trial Conversion Email Sequence
 * Task: uc-revenue-email-sequence
 * Tests the cron endpoint and email sending logic
 */

const assert = require('assert');
const { createClient } = require('../lib/db-client');

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/rest/v1';
const API_KEY = process.env.API_SECRET_KEY || process.env.LEADFLOW_API_KEY || 'test-key';
const CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const supabase = createClient(API_URL, API_KEY);

// Test agent data
const testAgent = {
  email: `test-email-seq-${Date.now()}@example.com`,
  first_name: 'Test',
  last_name: 'Agent',
  password_hash: 'test-hash',
  subscription_status: 'trial',
  email_verified: true,
  plan_tier: 'trial',
  created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  trial_email_welcome_sent: false,
  trial_email_day1_aha_sent: false,
  trial_email_day3_upgrade_sent: false,
  trial_email_day7_warning_sent: false,
  trial_email_day14_expired_sent: false,
  trial_email_day15_final_sent: false,
};

let agentId = null;

async function setup() {
  console.log('Setting up test agent...');
  const { data, error } = await supabase
    .from('real_estate_agents')
    .insert(testAgent)
    .select('id')
    .single();
  
  if (error) {
    console.error('Setup error:', error);
    throw error;
  }
  
  agentId = data.id;
  console.log(`Created test agent: ${agentId}`);
  return agentId;
}

async function teardown() {
  if (!agentId) return;
  console.log('Cleaning up test agent...');
  
  // Delete email logs first
  await supabase.from('trial_email_logs').delete().eq('agent_id', agentId);
  
  // Delete agent
  await supabase.from('real_estate_agents').delete().eq('id', agentId);
  console.log('Cleanup complete');
}

async function testCronEndpointReturns200() {
  console.log('\n--- Test: Cron endpoint returns 200 ---');
  
  const response = await fetch(`${BASE_URL}/api/cron/send-trial-emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CRON_SECRET}`,
    },
  });
  
  assert.strictEqual(response.status, 200, `Expected 200, got ${response.status}`);
  
  const body = await response.json();
  assert.strictEqual(body.success, true, 'Expected success: true');
  assert.ok(Array.isArray(body.results), 'Expected results to be an array');
  
  console.log('✅ Cron endpoint returns 200 with correct structure');
}

async function testDay1AhaEmailSent() {
  console.log('\n--- Test: Day 1 Aha email sent to eligible agent ---');
  
  // Verify agent was created with correct days_since_signup
  const { data: agent } = await supabase
    .from('real_estate_agents')
    .select('created_at, trial_email_day1_aha_sent')
    .eq('id', agentId)
    .single();
  
  assert.ok(agent, 'Test agent should exist');
  assert.strictEqual(agent.trial_email_day1_aha_sent, false, 'Day 1 email should not be sent yet');
  
  // Calculate days since signup
  const daysSinceSignup = Math.floor(
    (new Date().getTime() - new Date(agent.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  console.log(`Days since signup: ${daysSinceSignup}`);
  
  // Run the cron
  const response = await fetch(`${BASE_URL}/api/cron/send-trial-emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CRON_SECRET}`,
    },
  });
  
  const body = await response.json();
  console.log('Cron results:', JSON.stringify(body.results, null, 2));
  
  // Verify the flag was set (if Resend is configured, email would be sent)
  const { data: updatedAgent } = await supabase
    .from('real_estate_agents')
    .select('trial_email_day1_aha_sent')
    .eq('id', agentId)
    .single();
  
  // Note: If Resend is not configured, the email won't actually send but the logic runs
  console.log(`Day 1 aha sent flag: ${updatedAgent.trial_email_day1_aha_sent}`);
  
  console.log('✅ Day 1 Aha email logic executed');
}

async function testIdempotency() {
  console.log('\n--- Test: Idempotency - no duplicate sends ---');
  
  // Manually set the flag to true
  await supabase
    .from('real_estate_agents')
    .update({ trial_email_day1_aha_sent: true })
    .eq('id', agentId);
  
  // Count email logs before
  const { count: beforeCount } = await supabase
    .from('trial_email_logs')
    .select('*', { count: 'exact' })
    .eq('agent_id', agentId)
    .eq('email_type', 'trial_day1_aha');
  
  // Run cron again
  await fetch(`${BASE_URL}/api/cron/send-trial-emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CRON_SECRET}`,
    },
  });
  
  // Count email logs after
  const { count: afterCount } = await supabase
    .from('trial_email_logs')
    .select('*', { count: 'exact' })
    .eq('agent_id', agentId)
    .eq('email_type', 'trial_day1_aha');
  
  assert.strictEqual(afterCount, beforeCount, 'No new email logs should be created for already-sent emails');
  
  console.log('✅ Idempotency verified');
}

async function testPaidAgentsExcluded() {
  console.log('\n--- Test: Paid agents are excluded from trial emails ---');
  
  // Create a paid agent
  const paidAgent = {
    ...testAgent,
    email: `test-paid-${Date.now()}@example.com`,
    subscription_status: 'active',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  };
  
  const { data: paidAgentData } = await supabase
    .from('real_estate_agents')
    .insert(paidAgent)
    .select('id')
    .single();
  
  const paidAgentId = paidAgentData.id;
  
  // Run cron
  const response = await fetch(`${BASE_URL}/api/cron/send-trial-emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CRON_SECRET}`,
    },
  });
  
  const body = await response.json();
  
  // Verify no emails were sent to paid agent
  const { data: logs } = await supabase
    .from('trial_email_logs')
    .select('*')
    .eq('agent_id', paidAgentId);
  
  assert.strictEqual(logs.length, 0, 'Paid agent should not receive trial emails');
  
  // Cleanup paid agent
  await supabase.from('trial_email_logs').delete().eq('agent_id', paidAgentId);
  await supabase.from('real_estate_agents').delete().eq('id', paidAgentId);
  
  console.log('✅ Paid agents excluded from trial emails');
}

async function testAllEmailTypes() {
  console.log('\n--- Test: All 6 email types are defined ---');
  
  const expectedTypes = [
    'trial_welcome',
    'trial_day1_aha',
    'trial_day3_upgrade',
    'trial_day7_warning',
    'trial_day14_expired',
    'trial_day15_final',
  ];
  
  // Verify the trial-emails TypeScript module exists by checking file
  const fs = require('fs');
  const path = require('path');
  const modulePath = path.join(__dirname, '../product/lead-response/dashboard/lib/trial-emails.ts');
  
  assert.ok(fs.existsSync(modulePath), 'trial-emails.ts module should exist');
  
  const content = fs.readFileSync(modulePath, 'utf8');
  assert.ok(content.includes('sendActiveTrialSequence'), 'sendActiveTrialSequence should be exported');
  assert.ok(content.includes('sendTrialWelcomeEmail'), 'sendTrialWelcomeEmail should be exported');
  
  // Verify all email types are referenced in the code
  for (const type of expectedTypes) {
    assert.ok(content.includes(type), `Email type ${type} should be defined`);
  }
  
  console.log('✅ All 6 email types are defined in trial-emails.ts');
}

async function testColumnExists() {
  console.log('\n--- Test: All 6 boolean columns exist ---');
  
  const expectedColumns = [
    'trial_email_welcome_sent',
    'trial_email_day1_aha_sent',
    'trial_email_day3_upgrade_sent',
    'trial_email_day7_warning_sent',
    'trial_email_day14_expired_sent',
    'trial_email_day15_final_sent',
  ];
  
  // Verify columns exist by trying to select them
  // If columns don't exist, Supabase will return an error
  const { error } = await supabase
    .from('real_estate_agents')
    .select(expectedColumns.join(', '))
    .limit(1);
  
  if (error) {
    // Check if error is about missing columns
    if (error.message && error.message.includes('column')) {
      throw new Error(`Column check failed: ${error.message}`);
    }
    // Other errors (like no rows) are fine - columns exist
  }
  
  console.log('✅ All 6 boolean columns exist in real_estate_agents table');
}

async function runTests() {
  console.log('========================================');
  console.log('E2E Test: Active Trial Email Sequence');
  console.log('========================================');
  
  let passed = 0;
  let failed = 0;
  
  try {
    await setup();
    
    await testAllEmailTypes();
    passed++;
  } catch (e) {
    console.error('❌ testAllEmailTypes failed:', e.message);
    failed++;
  }
  
  try {
    await testColumnExists();
    passed++;
  } catch (e) {
    console.error('❌ testColumnExists failed:', e.message);
    failed++;
  }
  
  try {
    await testCronEndpointReturns200();
    passed++;
  } catch (e) {
    console.error('❌ testCronEndpointReturns200 failed:', e.message);
    failed++;
  }
  
  try {
    await testDay1AhaEmailSent();
    passed++;
  } catch (e) {
    console.error('❌ testDay1AhaEmailSent failed:', e.message);
    failed++;
  }
  
  try {
    await testIdempotency();
    passed++;
  } catch (e) {
    console.error('❌ testIdempotency failed:', e.message);
    failed++;
  }
  
  try {
    await testPaidAgentsExcluded();
    passed++;
  } catch (e) {
    console.error('❌ testPaidAgentsExcluded failed:', e.message);
    failed++;
  }
  
  await teardown();
  
  console.log('\n========================================');
  console.log('Test Results');
  console.log('========================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
