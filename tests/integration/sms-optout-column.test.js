/**
 * Integration test: sms_messages column name for opt-out detection
 * Task: 382ec80d-85f7-448f-82a0-f77dbac05bb1
 *
 * Verifies:
 * 1. DB schema has `message_body` column (not `body`) in sms_messages
 * 2. DB schema confirms NO direct agent_id on sms_messages (must join through leads)
 * 3. sms-stats route selects `message_body` (correct column) for opt-out detection
 * 4. sms-stats inbound query scopes by agent via leads!inner join (not direct agent_id)
 * 5. Opt-out filter references m.message_body (not m.body)
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

console.log('\n=== SMS Opt-Out Column Tests ===\n');

const pgUrl = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw';

// --- Test 1: DB schema ---
test('sms_messages table has message_body column', () => {
  const result = execSync(
    `psql "${pgUrl}" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='sms_messages' AND column_name='message_body';"`,
    { encoding: 'utf8' }
  ).trim();
  assert.ok(result.includes('message_body'), `message_body column not found in sms_messages schema`);
});

test('sms_messages table does NOT have a bare body column', () => {
  const result = execSync(
    `psql "${pgUrl}" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='sms_messages' AND column_name='body';"`,
    { encoding: 'utf8' }
  ).trim();
  assert.ok(!result.includes('body') || result === '', `Unexpected bare 'body' column found in sms_messages`);
});

test('sms_messages table does NOT have a direct agent_id column (joins through leads)', () => {
  const result = execSync(
    `psql "${pgUrl}" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='sms_messages' AND column_name='agent_id';"`,
    { encoding: 'utf8' }
  ).trim();
  assert.ok(!result.includes('agent_id') || result === '', `sms_messages has agent_id column — joins through leads may not be needed, review scoping`);
});

// --- Test 2: Route code ---
const routePath = path.join(
  __dirname,
  '../../product/lead-response/dashboard/app/api/analytics/sms-stats/route.ts'
);

test('sms-stats route file exists', () => {
  assert.ok(fs.existsSync(routePath), `Route not found at ${routePath}`);
});

const routeContent = fs.readFileSync(routePath, 'utf8');

// Extract just the inbound sms_messages section
// Bounded between the REPLY RATE comment block and the BOOKING CONVERSION comment block
const inboundSectionMatch = routeContent.match(
  /REPLY RATE[\s\S]*?(?=BOOKING CONVERSION)/
);
const inboundSection = inboundSectionMatch ? inboundSectionMatch[0] : routeContent;

test("inbound sms_messages select uses 'message_body' column (not bare 'body')", () => {
  assert.ok(
    inboundSection.includes('message_body'),
    "Expected message_body in inbound select query"
  );
  const hasWrongSelect = /\.select\(['"`]lead_id,\s*body['"`]\)/.test(inboundSection);
  assert.ok(!hasWrongSelect, "Inbound query selects bare 'body' instead of 'message_body'");
});

test('opt-out filter uses m.message_body (not m.body)', () => {
  assert.ok(
    routeContent.includes('m.message_body'),
    "Opt-out filter should use m.message_body"
  );
  assert.ok(
    !routeContent.includes('m.body)') && !routeContent.includes('m.body,'),
    "Opt-out filter uses m.body — wrong column name"
  );
});

test('inbound sms_messages query scopes agent via leads join (sms_messages has no agent_id)', () => {
  // sms_messages has no direct agent_id column — correct pattern is leads!inner(agent_id) join
  // with .eq('leads.agent_id', agentId)
  const usesLeadsJoin = inboundSection.includes("leads!inner(agent_id)") ||
                        inboundSection.includes("leads.agent_id");
  assert.ok(
    usesLeadsJoin,
    "Inbound sms_messages query must scope agent via leads join (sms_messages has no agent_id column)"
  );
});

test('inbound query does NOT use bare .eq(agent_id) directly on sms_messages', () => {
  // Direct .eq('agent_id', agentId) on sms_messages would fail at runtime — column does not exist
  const hasDirectFilter = /\.eq\(['"]agent_id['"],\s*agentId\)/.test(inboundSection);
  assert.ok(
    !hasDirectFilter,
    "Inbound query uses .eq('agent_id', agentId) directly — this column doesn't exist in sms_messages"
  );
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  process.exit(1);
}
