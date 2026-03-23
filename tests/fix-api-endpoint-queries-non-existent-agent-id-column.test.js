/**
 * Tests for: fix-api-endpoint-queries-non-existent-agent-id-column-
 * Task ID: 4baef92f-3808-4f21-ba7e-d654d01e06f5
 *
 * Verifies:
 * 1. messages table does NOT have an agent_id column
 * 2. The sms-stats route source code uses join syntax (leads!inner) instead of agent_id filter
 * 3. Queries against messages table with leads join work without error
 * 4. Filtering messages by agent via leads.agent_id returns correct results
 */

const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
    return false;
  }
  console.log(`✅ PASS: ${message}`);
  passed++;
  return true;
}

// ─────────────────────────────────────────────
// Test 1: messages table has no agent_id column
// ─────────────────────────────────────────────
async function testMessagesHasNoAgentIdColumn() {
  console.log('\n📋 Test 1: messages table has no agent_id column');

  // Attempting to filter by agent_id directly should cause a DB error
  const { data, error } = await supabase
    .from('messages')
    .select('id')
    .eq('agent_id', 'test-agent-id')
    .limit(1);

  assert(
    error !== null,
    `Querying messages.agent_id should fail (got error: ${error?.message || 'none'})`
  );

  if (error) {
    assert(
      error.message.includes('agent_id') || error.code === '42703',
      `Error message references agent_id column (got: ${error.message})`
    );
  }
}

// ─────────────────────────────────────────────
// Test 2: Source code uses join syntax, not direct agent_id filter
// ─────────────────────────────────────────────
async function testSourceCodeUsesJoinSyntax() {
  console.log('\n📋 Test 2: sms-stats source uses leads!inner join, not direct agent_id filter');

  const routePath = path.join(
    __dirname,
    '../product/lead-response/dashboard/app/api/analytics/sms-stats/route.ts'
  );

  assert(fs.existsSync(routePath), `sms-stats route exists at ${routePath}`);

  const source = fs.readFileSync(routePath, 'utf-8');

  // Should NOT use direct agent_id filter on a messages query
  // (bookings table CAN still use agent_id directly — that column exists there)
  // We check by scanning for outboundQuery or inboundQuery being followed by .eq('agent_id')
  const hasBuggyDirectFilter = /outboundQuery\s*=\s*outboundQuery\.eq\(['"]agent_id['"]|inboundQuery\s*=\s*inboundQuery\.eq\(['"]agent_id['"]/.test(source);
  assert(
    !hasBuggyDirectFilter,
    'Source does NOT have outboundQuery/inboundQuery .eq("agent_id") direct filter on messages'
  );

  // Should use the join syntax for outbound messages
  const hasOutboundJoin = source.includes("leads!inner(agent_id)");
  assert(hasOutboundJoin, 'Source includes leads!inner(agent_id) join in outbound query');

  // Should filter via the joined table column
  const hasJoinFilter = source.includes("leads.agent_id");
  assert(hasJoinFilter, 'Source filters by leads.agent_id (joined column)');
}

// ─────────────────────────────────────────────
// Test 3: Messages query with leads join works without error (no agentId filter)
// ─────────────────────────────────────────────
async function testMessagesQueryWithLeadsJoinWorks() {
  console.log('\n📋 Test 3: Querying messages with leads!inner join works without error');

  const { data, error } = await supabase
    .from('messages')
    .select('id, status, lead_id, leads!inner(agent_id)')
    .eq('direction', 'outbound')
    .limit(5);

  assert(
    !error,
    `messages with leads!inner join query succeeds (error: ${error?.message || 'none'})`
  );

  if (!error && data) {
    console.log(`   → Returned ${data.length} row(s)`);
    assert(true, 'messages with leads!inner join returns data successfully');
  }
}

// ─────────────────────────────────────────────
// Test 4: Filtering messages by leads.agent_id works correctly
// ─────────────────────────────────────────────
async function testFilterByLeadsAgentId() {
  console.log('\n📋 Test 4: Filtering messages by leads.agent_id works');

  // Use a non-existent agent ID — should return 0 rows, not an error
  const fakeAgentId = '00000000-0000-0000-0000-000000000000';

  const { data, error } = await supabase
    .from('messages')
    .select('id, status, lead_id, leads!inner(agent_id)')
    .eq('direction', 'outbound')
    .eq('leads.agent_id', fakeAgentId)
    .limit(5);

  assert(
    !error,
    `Filter by leads.agent_id does not produce error (error: ${error?.message || 'none'})`
  );

  if (!error) {
    assert(
      Array.isArray(data),
      `Returns an array (length: ${data?.length ?? 'undefined'})`
    );
  }
}

// ─────────────────────────────────────────────
// Test 5: Inbound query also uses join syntax
// ─────────────────────────────────────────────
async function testInboundQueryAlsoFixed() {
  console.log('\n📋 Test 5: Inbound messages query also uses leads!inner join');

  const routePath = path.join(
    __dirname,
    '../product/lead-response/dashboard/app/api/analytics/sms-stats/route.ts'
  );

  const source = fs.readFileSync(routePath, 'utf-8');

  // Count how many times leads!inner appears — should be at least 2 (outbound + inbound)
  const joinCount = (source.match(/leads!inner\(agent_id\)/g) || []).length;
  assert(
    joinCount >= 2,
    `Both outbound and inbound queries use leads!inner join (found ${joinCount} occurrences)`
  );

  // Both should filter via leads.agent_id
  const filterCount = (source.match(/\.eq\(['"]leads\.agent_id['"]/g) || []).length;
  assert(
    filterCount >= 2,
    `Both queries filter via leads.agent_id (found ${filterCount} occurrences)`
  );
}

// ─────────────────────────────────────────────
// Run all tests
// ─────────────────────────────────────────────
async function runAll() {
  console.log('🧪 Running tests for: fix-api-endpoint-queries-non-existent-agent-id-column');
  console.log('='.repeat(70));

  await testMessagesHasNoAgentIdColumn();
  await testSourceCodeUsesJoinSyntax();
  await testMessagesQueryWithLeadsJoinWorks();
  await testFilterByLeadsAgentId();
  await testInboundQueryAlsoFixed();

  console.log('\n' + '='.repeat(70));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
