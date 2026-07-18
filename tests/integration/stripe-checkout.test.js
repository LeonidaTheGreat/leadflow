'use strict';

/**
 * Stripe Checkout Integration Smoke Test
 * Spec: completion-reports/TASK-9e536206-SPEC.md
 *
 * 4 tests, no jest, standalone node runner.
 * Tests 1–3 always run (no credentials required).
 * Test 4 skips when STRIPE_WEBHOOK_SECRET is absent.
 */

// ─── Bootstrap env BEFORE loading any modules ────────────────────────────────
// dotenv (called inside server.js) does NOT overwrite existing env vars, so
// anything we set here is preserved through the require chain.

// Prevent server.js auto-listen so we can bind to port 0 ourselves.
// lib/config throws on missing STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET in
// production mode — set placeholders so the config check passes while keeping
// real credentials if they were already in the environment.
process.env.NODE_ENV = 'production';

if (!process.env.STRIPE_SECRET_KEY) {
  process.env.STRIPE_SECRET_KEY = 'sk_test_smoke_placeholder_no_api_calls';
}

// Ensure auth middleware has a key to validate against.
if (!process.env.LEADFLOW_API_KEY) {
  process.env.LEADFLOW_API_KEY = 'test-api-key-stripe-checkout-smoke';
}

// Track whether the operator provided a real webhook secret (enables test 4).
const hasRealWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;

// Provide a placeholder so the route skips the 503 path and reaches HMAC
// verification for test 3 (missing signature → 400).
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder_smoke';
}

// ─── Load server AFTER env is configured ─────────────────────────────────────
const assert = require('assert');
const http = require('http');
const app = require('../../server');

// ─── Test harness ─────────────────────────────────────────────────────────────
let passed = 0, failed = 0, skipped = 0;

function pass(label) { passed++; console.log(`  ✅ ${label}`); }
function fail(label, reason) { failed++; console.error(`  ❌ ${label}: ${reason}`); }
function skip(label, reason) { skipped++; console.log(`  ⏭  ${label} [SKIPPED: ${reason}]`); }

function post(server, urlPath, headers, rawBody) {
  return new Promise((resolve, reject) => {
    const payload = rawBody !== undefined ? JSON.stringify(rawBody) : '';
    const reqHeaders = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      ...headers,
    };
    const port = server.address().port;
    const req = http.request(
      { hostname: '127.0.0.1', port, path: urlPath, method: 'POST', headers: reqHeaders },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try { resolve({ statusCode: res.statusCode, body: JSON.parse(data) }); }
          catch (_) { resolve({ statusCode: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────
async function runTests(server) {
  const apiKey = process.env.LEADFLOW_API_KEY;

  // Test 1 — billing endpoint validates body, not auth (no body → missing userId → 400)
  console.log('\n[1] Billing endpoint rejects missing userId');
  try {
    const res = await post(server, '/api/billing/checkout', { 'x-api-key': apiKey }, {});
    assert.strictEqual(res.statusCode, 400, `Expected 400, got ${res.statusCode}`);
    assert.ok(res.body && res.body.error, 'Response must have an error field');
    pass('POST /api/billing/checkout with no body → 400');
  } catch (e) {
    fail('POST /api/billing/checkout with no body → 400', e.message);
  }

  // Test 2 — auth middleware rejects wrong API key
  console.log('\n[2] Billing endpoint rejects invalid API key');
  try {
    const res = await post(server, '/api/billing/checkout', { 'x-api-key': 'wrong-key' }, { userId: 'u1' });
    assert.strictEqual(res.statusCode, 401, `Expected 401, got ${res.statusCode}`);
    pass('POST /api/billing/checkout with wrong API key → 401');
  } catch (e) {
    fail('POST /api/billing/checkout with wrong API key → 401', e.message);
  }

  // Test 3 — webhook guard is active (no signature header → HMAC check fails → 400)
  console.log('\n[3] Webhook rejects missing stripe-signature');
  try {
    const res = await post(server, '/webhook/stripe', {}, { type: 'test.event', data: {} });
    assert.strictEqual(res.statusCode, 400, `Expected 400, got ${res.statusCode}`);
    pass('POST /webhook/stripe with no stripe-signature → 400');
  } catch (e) {
    fail('POST /webhook/stripe with no stripe-signature → 400', e.message);
  }

  // Test 4 — HMAC verification rejects bad signature (skipped if no real webhook secret)
  console.log('\n[4] Webhook rejects bad HMAC signature');
  if (!hasRealWebhookSecret) {
    skip('POST /webhook/stripe with bad HMAC → 400', 'STRIPE_WEBHOOK_SECRET not set');
  } else {
    try {
      const res = await post(
        server, '/webhook/stripe',
        { 'stripe-signature': 't=1234,v1=badhash' },
        { type: 'test.event', data: {} }
      );
      assert.strictEqual(res.statusCode, 400, `Expected 400, got ${res.statusCode}`);
      pass('POST /webhook/stripe with bad HMAC → 400');
    } catch (e) {
      fail('POST /webhook/stripe with bad HMAC → 400', e.message);
    }
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────
const server = app.listen(0, '127.0.0.1', async () => {
  try {
    await runTests(server);
  } finally {
    server.close();
    console.log(`\n${'─'.repeat(55)}`);
    console.log(`Tests: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    if (failed > 0) {
      console.error('\n❌ Tests FAILED');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed');
      process.exit(0);
    }
  }
});

server.on('error', (err) => {
  console.error('Server failed to start:', err.message);
  process.exit(1);
});
