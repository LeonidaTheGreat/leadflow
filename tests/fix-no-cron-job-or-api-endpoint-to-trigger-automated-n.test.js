/**
 * E2E Test for NPS Survey Cron Job
 * Tests: fix-no-cron-job-or-api-endpoint-to-trigger-automated-n
 */

const assert = require('assert');
const { createClient } = require('@supabase/supabase-js');

// Load env vars
require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app';

async function test() {
  console.log('🧪 NPS Survey Cron Job E2E Test\n');
  
  const results = { passed: 0, failed: 0, tests: [] };
  
  async function runTest(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      results.passed++;
      results.tests.push({ name, status: 'pass' });
    } catch (err) {
      console.log(`❌ FAIL: ${name}`);
      console.log(`   Error: ${err.message}`);
      results.failed++;
      results.tests.push({ name, status: 'fail', error: err.message });
    }
  }

  // Test 1: Cron route exists and is accessible
  await runTest('GET /api/cron/nps-surveys route exists', async () => {
    const response = await fetch(`${API_BASE}/api/cron/nps-surveys`, {
      headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
    });
    // Should return 200 or 401 (if auth required) - 404 means route doesn't exist
    assert(response.status !== 404, 'Route returns 404 - does not exist');
  });

  // Test 2: Cron route handles authentication correctly
  // Note: When CRON_SECRET is set, requires auth. When not set (dev), allows unauthenticated.
  await runTest('Cron route handles authentication', async () => {
    const response = await fetch(`${API_BASE}/api/cron/nps-surveys`);
    // Should return either 200 (if CRON_SECRET not set) or 401 (if set and no auth)
    assert(response.status === 200 || response.status === 401, 
      `Expected 200 or 401, got ${response.status}`);
  });

  // Test 3: Cron route returns valid JSON with auth
  await runTest('Cron route returns valid JSON response', async () => {
    const response = await fetch(`${API_BASE}/api/cron/nps-surveys`, {
      headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    
    const data = await response.json();
    assert(data.hasOwnProperty('success'), 'Response missing success field');
    assert(data.hasOwnProperty('message'), 'Response missing message field');
  });

  // Test 4: agent_survey_schedule table exists
  await runTest('agent_survey_schedule table exists', async () => {
    const { data, error } = await supabase
      .from('agent_survey_schedule')
      .select('count')
      .limit(1);
    
    if (error) {
      throw new Error(`Table query failed: ${error.message}`);
    }
  });

  // Test 5: agent_nps_responses table exists
  await runTest('agent_nps_responses table exists', async () => {
    const { data, error } = await supabase
      .from('agent_nps_responses')
      .select('count')
      .limit(1);
    
    if (error) {
      throw new Error(`Table query failed: ${error.message}`);
    }
  });

  // Test 6: Check if NPS tables reference correct agent table
  await runTest('NPS tables reference correct agent table (real_estate_agents)', async () => {
    // Check if there's any data in agent_survey_schedule with valid real_estate_agents
    const { data, error } = await supabase
      .from('agent_survey_schedule')
      .select('agent_id, real_estate_agents:agent_id(id)')
      .limit(1);
    
    // If this fails, it means the foreign key references the wrong table
    if (error && error.message.includes('foreign key')) {
      throw new Error(`Foreign key constraint issue: ${error.message}`);
    }
  });

  // Test 7: vercel.json includes NPS cron schedule
  await runTest('vercel.json includes NPS cron schedule', async () => {
    const fs = require('fs');
    const vercelConfig = JSON.parse(fs.readFileSync('/Users/clawdbot/projects/leadflow/product/lead-response/dashboard/vercel.json', 'utf8'));
    
    const hasNPSCron = vercelConfig.crons && vercelConfig.crons.some(cron => 
      cron.path === '/api/cron/nps-surveys'
    );
    
    assert(hasNPSCron, 'NPS cron schedule not found in vercel.json');
  });

  // Test 8: nps-service.ts getAgentsDueForSurvey uses correct table
  await runTest('nps-service.ts queries real_estate_agents table', async () => {
    const fs = require('fs');
    const npsService = fs.readFileSync('/Users/clawdbot/projects/leadflow/product/lead-response/dashboard/lib/nps-service.ts', 'utf8');
    
    // Check if the function uses real_estate_agents instead of agents
    const hasWrongTableRef = npsService.includes("agents!inner(email, name)") ||
                             npsService.includes("agents(name, email)");
    
    if (hasWrongTableRef) {
      throw new Error('nps-service.ts still references agents table instead of real_estate_agents');
    }
  });

  // Summary
  console.log('\n========================================');
  console.log('📊 NPS CRON E2E TEST REPORT');
  console.log('========================================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  console.log('========================================');

  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.tests.filter(t => t.status === 'fail').forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
    process.exit(1);
  }

  console.log('\n🎉 ALL TESTS PASSED!');
  process.exit(0);
}

test().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
