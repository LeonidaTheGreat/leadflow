/**
 * QC E2E Test: fix-api-endpoint-queries-non-existent-agent-id-column-
 * QC Task ID: 927216f6-3269-4c4a-97f1-d03415458cb2
 *
 * Scope: Verify the sms-stats API fix correctly joins messages→leads
 * to filter by agent, without touching the non-existent messages.agent_id column.
 *
 * Tests:
 *  1. Old (buggy) direct agent_id query fails as expected
 *  2. Fixed outbound query with join succeeds and returns valid shape
 *  3. Inbound query — verifies message body column name (route uses 'body', actual is 'message_body')
 *  4. Agent-scoped query returns only that agent's data
 *  5. Global (no agent filter) query works
 *  6. Source code regression check
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// ────────────────────────────────────────────────────────────
// Test 1: Confirm the bug — old query pattern fails
// ────────────────────────────────────────────────────────────
async function test1_oldQueryFails() {
  console.log('\n[T1] Old direct agent_id query on messages should error');

  const { data, error } = await supabase
    .from('messages')
    .select('id, agent_id')
    .limit(1);

  assert(error !== null, 'SELECT agent_id from messages returns an error');
  assert(
    error?.code === '42703' || (error?.message || '').includes('agent_id'),
    `Error is PGERROR 42703 (undefined column): "${error?.message}"`
  );
}

// ────────────────────────────────────────────────────────────
// Test 2: Fixed outbound query (join pattern) succeeds
// ────────────────────────────────────────────────────────────
async function test2_fixedOutboundQuery() {
  console.log('\n[T2] Fixed outbound query with leads!inner join');

  const { data, error } = await supabase
    .from('messages')
    .select('id, status, lead_id, leads!inner(agent_id)')
    .eq('direction', 'outbound')
    .limit(10);

  assert(!error, `No error (got: ${error?.message || 'none'})`);
  assert(Array.isArray(data), 'Returns an array');

  if (data && data.length > 0) {
    const sample = data[0];
    assert('lead_id' in sample,  'Row has lead_id field');
    assert('leads' in sample,    'Row has nested leads object from join');
    assert('status' in sample,   'Row has status field');
    const leads = sample.leads;
    assert(
      leads !== null && 'agent_id' in leads,
      `Joined leads object has agent_id (sample: ${JSON.stringify(leads)})`
    );
  } else {
    console.log('  ℹ️  No outbound messages in DB — shape test skipped');
    passed++;
  }
}

// ────────────────────────────────────────────────────────────
// Test 3: Verify the actual column name for message body
// The route.ts inbound query selects 'body' but the real column is 'message_body'
// ────────────────────────────────────────────────────────────
async function test3_messageBodyColumnName() {
  console.log('\n[T3] Inbound query message body column name verification');

  // Correct column name works
  const { data: correctData, error: correctError } = await supabase
    .from('messages')
    .select('message_body')
    .eq('direction', 'inbound')
    .limit(1);

  assert(!correctError, `Selecting message_body (correct column) succeeds: ${correctError?.message || 'none'}`);

  // What the route actually does — 'body' does NOT exist
  const { data: buggyData, error: buggyError } = await supabase
    .from('messages')
    .select('lead_id, body, leads!inner(agent_id)')
    .eq('direction', 'inbound')
    .limit(1);

  // BUG: route selects 'body' but real column is 'message_body'
  // This test PASSES if we detect the bug (error present)
  assert(
    buggyError !== null,
    `BUG CONFIRMED: route.ts inbound query uses "body" but column is "message_body" — ` +
    `error: "${buggyError?.message || 'no error (column may have been added)'}"`
  );

  // Verify the correct query works with message_body + join
  const { data: fixedData, error: fixedError } = await supabase
    .from('messages')
    .select('lead_id, message_body, leads!inner(agent_id)')
    .eq('direction', 'inbound')
    .limit(1);

  assert(!fixedError, `Correct inbound query (message_body + join) succeeds: ${fixedError?.message || 'none'}`);
}

// ────────────────────────────────────────────────────────────
// Test 4: Agent-scoped filter returns no error and consistent counts
// ────────────────────────────────────────────────────────────
async function test4_agentScopedQuery() {
  console.log('\n[T4] Agent-scoped filter via leads.agent_id');

  const { data: agentRows } = await supabase
    .from('agents')
    .select('id')
    .limit(1);

  const agentId = agentRows?.[0]?.id ?? '00000000-0000-0000-0000-000000000000';
  console.log(`  ℹ️  Using agent_id: ${agentId}`);

  const { data: outbound, error: outErr } = await supabase
    .from('messages')
    .select('id, lead_id, leads!inner(agent_id)')
    .eq('direction', 'outbound')
    .eq('leads.agent_id', agentId)
    .limit(100);

  assert(!outErr, `Outbound agent-scoped query has no error (got: ${outErr?.message || 'none'})`);

  if (outbound && outbound.length > 0) {
    const allMatch = outbound.every(m => m.leads?.agent_id === agentId);
    assert(allMatch, 'All outbound rows have correct agent_id via join');
  } else {
    console.log('  ℹ️  No outbound messages for this agent — skip row-level assertion');
    passed++;
  }
}

// ────────────────────────────────────────────────────────────
// Test 5: Global (no agent filter) query still works
// ────────────────────────────────────────────────────────────
async function test5_globalQueryWorks() {
  console.log('\n[T5] Global query (no agent filter) still works');

  const { data, error } = await supabase
    .from('messages')
    .select('id, status, lead_id, leads!inner(agent_id)')
    .eq('direction', 'outbound')
    .limit(5);

  assert(!error, `No error for global query (got: ${error?.message || 'none'})`);
  assert(Array.isArray(data), 'Global query returns array');
}

// ────────────────────────────────────────────────────────────
// Test 6: Source code regression check
// ────────────────────────────────────────────────────────────
async function test6_sourceCodeCheck() {
  console.log('\n[T6] Source code checks');

  const routePath = path.join(
    __dirname,
    '../product/lead-response/dashboard/app/api/analytics/sms-stats/route.ts'
  );
  assert(fs.existsSync(routePath), 'sms-stats route.ts exists');

  const src = fs.readFileSync(routePath, 'utf8');

  // MUST NOT: direct agent_id filter on messages queries
  const hasBuggy = /(?:outbound|inbound)Query\s*=\s*\w+Query\.eq\(['"]agent_id['"]/.test(src);
  assert(!hasBuggy, 'No direct .eq("agent_id") on outbound/inbound query chains');

  // MUST: join via leads!inner
  const joinCount = (src.match(/leads!inner\(agent_id\)/g) || []).length;
  assert(joinCount >= 2, `At least 2 leads!inner joins present (found ${joinCount})`);

  // MUST: filter via leads.agent_id
  const filterCount = (src.match(/\.eq\(['"]leads\.agent_id['"]/g) || []).length;
  assert(filterCount >= 2, `At least 2 leads.agent_id filters present (found ${filterCount})`);

  // MUST NOT: no hardcoded secrets
  const hasHardcodedSecret = /supabase\.co.*service_role|eyJ[A-Za-z0-9_-]{10,}/i.test(src);
  assert(!hasHardcodedSecret, 'No hardcoded Supabase secrets in source');

  // BUG CHECK: inbound select uses 'body' — actual column is 'message_body'
  const hasBodyBug = /\.select\(['"]lead_id, body,/.test(src) || /\.select\("lead_id, body,/.test(src);
  assert(
    !hasBodyBug,
    `BUG: inbound query selects non-existent column 'body' (should be 'message_body'). ` +
    `Fix: change .select('lead_id, body, leads!inner...') → .select('lead_id, message_body, leads!inner...')`
  );
}

// ────────────────────────────────────────────────────────────
// Runner
// ────────────────────────────────────────────────────────────
async function main() {
  console.log('═'.repeat(65));
  console.log('QC E2E: fix-api-endpoint-queries-non-existent-agent-id-column');
  console.log('═'.repeat(65));

  await test1_oldQueryFails();
  await test2_fixedOutboundQuery();
  await test3_messageBodyColumnName();
  await test4_agentScopedQuery();
  await test5_globalQueryWorks();
  await test6_sourceCodeCheck();

  console.log('\n' + '═'.repeat(65));
  console.log(`QC Results: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(65));

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
