#!/usr/bin/env node
/**
 * Test: lib/onboarding-telemetry.js exists and createStuckAlerts() works
 *
 * Verifies:
 *  1. The file exists and exports required functions
 *  2. createStuckAlerts() processes stuck agents and inserts product_feedback rows
 *  3. feedback_type=ux_issue, source=telemetry_alert, data contains agent_id/step/hours_stuck
 *  4. The cron route check-stuck-agents is registered in vercel.json
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FAIL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const LIB_PATH = path.join(__dirname, '../lib/onboarding-telemetry.js');
const VERCEL_JSON_PATH = path.join(__dirname, '../product/lead-response/dashboard/vercel.json');

async function cleanup(supabase, agentId) {
  await supabase.from('product_feedback').delete().eq('agent_id', agentId);
  await supabase.from('onboarding_stuck_alerts').delete().eq('agent_id', agentId);
  await supabase.from('real_estate_agents').delete().eq('id', agentId);
}

async function runTests() {
  let passed = 0;
  let total = 0;

  // ─── Test 1: File exists ───────────────────────────────────────────────────
  total++;
  console.log('[Test 1] lib/onboarding-telemetry.js exists...');
  assert(fs.existsSync(LIB_PATH), `File not found: ${LIB_PATH}`);
  console.log('✓ File exists');
  passed++;

  // ─── Test 2: Required exports exist ───────────────────────────────────────
  total++;
  console.log('[Test 2] Required exports exist...');
  const telemetry = require(LIB_PATH);
  assert(typeof telemetry.createStuckAlerts === 'function', 'createStuckAlerts must be a function');
  assert(typeof telemetry.checkAndAlertStuckAgents === 'function', 'checkAndAlertStuckAgents must be a function');
  assert(typeof telemetry.logOnboardingEvent === 'function', 'logOnboardingEvent must be a function');
  console.log('✓ All required exports present');
  passed++;

  // ─── Test 3: vercel.json has check-stuck-agents cron ──────────────────────
  total++;
  console.log('[Test 3] vercel.json registers check-stuck-agents cron...');
  const vercelJson = JSON.parse(fs.readFileSync(VERCEL_JSON_PATH, 'utf8'));
  const cronPaths = (vercelJson.crons || []).map((c) => c.path);
  assert(
    cronPaths.includes('/api/cron/check-stuck-agents'),
    `Expected /api/cron/check-stuck-agents in vercel.json crons. Found: ${JSON.stringify(cronPaths)}`
  );
  console.log('✓ check-stuck-agents cron is registered in vercel.json');
  passed++;

  // ─── Test 4: createStuckAlerts() inserts product_feedback rows ────────────
  total++;
  console.log('[Test 4] createStuckAlerts() inserts product_feedback with correct fields...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const stuckSince = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(); // 26 hours ago
  const testEmail = `ot-fix-${Date.now()}@leadflow-test.com`;

  const { data: agent, error: agentErr } = await supabase
    .from('real_estate_agents')
    .insert({
      email: testEmail,
      password_hash: 'test-hash',
      first_name: 'OT',
      last_name: 'Fix',
      onboarding_step: 1,
      last_onboarding_step_update: stuckSince,
    })
    .select()
    .single();

  if (agentErr) {
    console.error('FAIL: Could not create test agent:', agentErr.message);
    process.exit(1);
  }

  const agentId = agent.id;

  try {
    const stuckAgents = [
      {
        id: agentId,
        email: testEmail,
        onboarding_step: 1,
        last_onboarding_step_update: stuckSince,
      },
    ];

    const result = await telemetry.createStuckAlerts(supabase, stuckAgents);
    assert.strictEqual(result.success, true, `Expected success=true, got: ${JSON.stringify(result)}`);
    assert(result.alerts_created >= 1, `Expected >=1 alert, got ${result.alerts_created}`);

    // Verify product_feedback row
    const { data: fbRows, error: fbErr } = await supabase
      .from('product_feedback')
      .select('*')
      .eq('agent_id', agentId);

    assert(!fbErr, `product_feedback query error: ${fbErr?.message}`);
    assert(fbRows.length >= 1, `Expected >=1 product_feedback row, got ${fbRows.length}`);

    const fb = fbRows[0];
    assert.strictEqual(fb.feedback_type, 'ux_issue', `Expected feedback_type=ux_issue, got ${fb.feedback_type}`);
    assert.strictEqual(fb.source, 'telemetry_alert', `Expected source=telemetry_alert, got ${fb.source}`);
    assert(fb.data && fb.data.agent_id === agentId, 'Expected data.agent_id in product_feedback');
    assert(fb.data.step_name, 'Expected data.step_name in product_feedback');
    assert(typeof fb.data.hours_stuck === 'number', 'Expected data.hours_stuck to be a number');

    console.log(
      `✓ product_feedback row: type=${fb.feedback_type} source=${fb.source} agent=${fb.data.agent_id} step=${fb.data.step_name} hours=${fb.data.hours_stuck}`
    );
    passed++;

    await cleanup(supabase, agentId);
  } catch (err) {
    await cleanup(supabase, agentId);
    throw err;
  }

  console.log(`\n✅ All tests passed (${passed}/${total})`);
  return { passed, total };
}

runTests()
  .then(({ passed, total }) => {
    process.exit(passed === total ? 0 : 1);
  })
  .catch((err) => {
    console.error('\n❌ Test failed:', err.message);
    process.exit(1);
  });
