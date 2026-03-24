/**
 * E2E Test: sms_messages.direction values are outbound-api not outbound
 *
 * Bug: The sms_messages table stores Twilio direction values ('outbound-api',
 * 'outbound-reply', 'inbound'). The sms-stats API was incorrectly filtering
 * with direction='outbound' which never matches any row.
 *
 * Fix: Query sms_messages table (not messages) with .in('direction', ['outbound-api', 'outbound-reply'])
 * and use message_body column (not 'body') for inbound opt-out detection.
 *
 * Task: fix-sms-messages-direction-values-are-outbound-api-not
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROUTE_PATH = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/analytics/sms-stats/route.ts'
);

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function pass(msg) { console.log(`${GREEN}✅ PASS: ${msg}${RESET}`); }
function fail(msg) { console.error(`${RED}❌ FAIL: ${msg}${RESET}`); }

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    pass(name);
    passed++;
  } catch (e) {
    fail(`${name} — ${e.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=== SMS Direction Fix: sms_messages.direction = outbound-api ===\n');

  assert(fs.existsSync(ROUTE_PATH), `Route file not found: ${ROUTE_PATH}`);
  const src = fs.readFileSync(ROUTE_PATH, 'utf8');

  // ── Table ────────────────────────────────────────────────────────────────

  test('Outbound query targets sms_messages table (not messages)', () => {
    assert(
      src.includes(".from('sms_messages')"),
      "Expected .from('sms_messages') in route source"
    );
  });

  test('Route does NOT query the old messages table for sms stats', () => {
    // The route may import from @/lib/supabase which wraps messages, but
    // the direct .from('messages') for analytics queries must be gone.
    // We check that any .from('messages') is NOT in an outbound or inbound query context.
    const fromMessagesWithDirection = /\.from\(['"]messages['"]\)[^;]*direction/s.test(src);
    assert(
      !fromMessagesWithDirection,
      "Found .from('messages') used with direction filter — should use sms_messages instead"
    );
  });

  // ── Outbound direction ────────────────────────────────────────────────────

  test("Outbound filter uses .in() with Twilio direction values, not .eq('direction', 'outbound')", () => {
    // Must use .in() with the Twilio variants
    const hasInFilter =
      src.includes(".in('direction'") ||
      src.includes('.in("direction"');
    assert(hasInFilter, "Expected .in('direction', ...) for outbound filter");
  });

  test("outbound-api is included in outbound direction filter", () => {
    assert(
      src.includes("'outbound-api'") || src.includes('"outbound-api"'),
      "Expected 'outbound-api' in direction filter"
    );
  });

  test("outbound-reply is included in outbound direction filter", () => {
    assert(
      src.includes("'outbound-reply'") || src.includes('"outbound-reply"'),
      "Expected 'outbound-reply' in direction filter"
    );
  });

  test("Does NOT filter with bare 'outbound' direction value", () => {
    // Must not have .eq('direction', 'outbound') — Twilio never stores plain 'outbound'
    const hasBareOutbound = /\.eq\(['"]direction['"],\s*['"]outbound['"]\)/.test(src);
    assert(
      !hasBareOutbound,
      "Found .eq('direction', 'outbound') — Twilio uses 'outbound-api'/'outbound-reply'"
    );
  });

  // ── Inbound direction ────────────────────────────────────────────────────

  test("Inbound filter uses 'inbound' (correct Twilio value)", () => {
    assert(
      src.includes("'inbound'") || src.includes('"inbound"'),
      "Expected 'inbound' direction value"
    );
  });

  // ── Column names ──────────────────────────────────────────────────────────

  test("Inbound select uses message_body column (not 'body')", () => {
    assert(
      src.includes('message_body'),
      "Expected 'message_body' column in inbound select (sms_messages schema)"
    );
  });

  test("Opt-out check reads m.message_body (not m.body)", () => {
    assert(
      src.includes('m.message_body') || src.includes('.message_body'),
      "Expected opt-out check to use message_body (sms_messages column)"
    );
  });

  test("Does NOT use bare 'body' field for opt-out check", () => {
    // m.body would be wrong for sms_messages; only m.message_body should appear
    const hasBareBodyAccess = /\bm\.body\b/.test(src);
    assert(
      !hasBareBodyAccess,
      "Found m.body — should use m.message_body for sms_messages rows"
    );
  });

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('\n============================================================');
  console.log('📊 TEST RESULTS');
  console.log('============================================================');
  console.log(`${GREEN}✅ Passed: ${passed}${RESET}`);
  if (failed > 0) {
    console.log(`${RED}❌ Failed: ${failed}${RESET}`);
  } else {
    console.log(`\n🎉 All ${passed} tests passed — sms_messages direction fix verified\n`);
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(RED + 'Fatal test error: ' + e.message + RESET);
  process.exit(1);
});
