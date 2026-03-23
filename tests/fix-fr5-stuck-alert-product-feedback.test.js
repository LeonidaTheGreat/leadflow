#!/usr/bin/env node
/**
 * Test: FR-5 — createStuckAlerts() inserts product_feedback rows
 *
 * Verifies that when createStuckAlerts() processes a stuck agent it:
 *   1. Inserts a row into onboarding_stuck_alerts
 *   2. Inserts a row into product_feedback with feedback_type=ux_issue and source=telemetry_alert
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FAIL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const { createStuckAlerts } = require(path.join(__dirname, '../lib/onboarding-telemetry'));

async function cleanup(supabase, agentId) {
  await supabase.from('product_feedback').delete().eq('agent_id', agentId);
  await supabase.from('onboarding_stuck_alerts').delete().eq('agent_id', agentId);
  await supabase.from('real_estate_agents').delete().eq('id', agentId);
}

async function runTests() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ─── Insert a synthetic stuck agent ──────────────────────────────────────
  const stuckSince = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago
  const testEmail = `fr5-test-${Date.now()}@leadflow-test.com`;

  const { data: agent, error: agentErr } = await supabase
    .from('real_estate_agents')
    .insert({
      email: testEmail,
      password_hash: 'test-hash',
      first_name: 'FR5',
      last_name: 'Test',
      onboarding_step: 2,
      last_onboarding_step_update: stuckSince,
    })
    .select()
    .single();

  if (agentErr) {
    console.error('FAIL: Could not create test agent:', agentErr.message);
    process.exit(1);
  }

  const agentId = agent.id;
  console.log(`✓ Test agent created: ${agentId} (${testEmail})`);

  try {
    // ─── Run createStuckAlerts ──────────────────────────────────────────────
    console.log('\n[Test 1] createStuckAlerts() with a stuck agent...');
    const stuckAgents = [
      {
        id: agentId,
        email: testEmail,
        onboarding_step: 2,
        last_onboarding_step_update: stuckSince,
      },
    ];

    const result = await createStuckAlerts(supabase, stuckAgents);
    assert.strictEqual(result.success, true, `Expected success=true, got: ${JSON.stringify(result)}`);
    assert(result.alerts_created >= 1, `Expected at least 1 alert, got ${result.alerts_created}`);
    console.log(`✓ createStuckAlerts returned success, alerts_created=${result.alerts_created}`);

    // ─── Verify onboarding_stuck_alerts row ────────────────────────────────
    console.log('\n[Test 2] Verify onboarding_stuck_alerts row exists...');
    const { data: alertRows, error: alertErr } = await supabase
      .from('onboarding_stuck_alerts')
      .select('*')
      .eq('agent_id', agentId);

    assert(!alertErr, `Query error: ${alertErr?.message}`);
    assert(alertRows.length >= 1, `Expected >=1 stuck alert row, got ${alertRows.length}`);
    assert.strictEqual(alertRows[0].step_name, 'fub_connected', `Expected step fub_connected, got ${alertRows[0].step_name}`);
    console.log('✓ onboarding_stuck_alerts row exists with correct step_name');

    // ─── Verify product_feedback row ──────────────────────────────────────
    console.log('\n[Test 3] Verify product_feedback row exists with correct fields...');
    const { data: fbRows, error: fbErr } = await supabase
      .from('product_feedback')
      .select('*')
      .eq('agent_id', agentId);

    assert(!fbErr, `product_feedback query error: ${fbErr?.message}`);
    assert(fbRows.length >= 1, `Expected >=1 product_feedback row, got ${fbRows.length}`);

    const fb = fbRows[0];
    assert.strictEqual(fb.feedback_type, 'ux_issue', `Expected feedback_type=ux_issue, got ${fb.feedback_type}`);
    assert.strictEqual(fb.source, 'telemetry_alert', `Expected source=telemetry_alert, got ${fb.source}`);
    assert.strictEqual(fb.project_id, 'leadflow', `Expected project_id=leadflow, got ${fb.project_id}`);
    assert(fb.data, 'Expected data JSONB to be set');
    assert.strictEqual(fb.data.step_name, 'fub_connected', `Expected data.step_name=fub_connected, got ${fb.data.step_name}`);
    assert.strictEqual(fb.data.agent_id, agentId, 'Expected data.agent_id to match agent');
    console.log('✓ product_feedback row has feedback_type=ux_issue, source=telemetry_alert, project_id=leadflow');
    console.log(`✓ product_feedback.data: ${JSON.stringify(fb.data)}`);

    // ─── Idempotency: second run should update alert, not create new feedback ─
    console.log('\n[Test 4] Second run — should update existing alert (idempotency)...');
    const result2 = await createStuckAlerts(supabase, stuckAgents);
    assert.strictEqual(result2.success, true, 'Second run should succeed');

    // No additional product_feedback row should be inserted (alert already exists)
    const { data: fbRows2 } = await supabase
      .from('product_feedback')
      .select('id')
      .eq('agent_id', agentId);
    assert.strictEqual(fbRows2.length, 1, `Expected still 1 product_feedback row after second run, got ${fbRows2.length}`);
    console.log('✓ Second run did not duplicate product_feedback row');

    console.log('\n✅ All FR-5 tests passed!');
    await cleanup(supabase, agentId);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    await cleanup(supabase, agentId);
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
