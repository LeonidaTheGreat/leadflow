'use strict';

/**
 * Stripe Checkout Integration Smoke Test
 *
 * Required env vars (placeholder values used when absent):
 *   STRIPE_SECRET_KEY     — Stripe API key (test mode: sk_test_...)
 *   STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
 *   LEADFLOW_API_KEY      — Internal API key for billing endpoint auth
 *
 * All 5 tests run unconditionally. Tests 1–2 prove billing endpoint
 * validation. Tests 3–5 prove the webhook HMAC guard. Tests 3–4 use
 * placeholder credentials (any secret rejects a bad/absent signature).
 * Test 5 signs and verifies with the SAME secret (placeholder or real),
 * so the HMAC always matches regardless of whether real credentials are set.
 */

// ─── Bootstrap env BEFORE loading any modules ───────────────────────────────
// lib/config/index.js throws on missing STRIPE_* vars in production mode.
// Set placeholder values so startup succeeds; real credentials from the
// environment (if present) take precedence because dotenv never overwrites.
process.env.NODE_ENV = 'production';

if (!process.env.STRIPE_SECRET_KEY) {
  process.env.STRIPE_SECRET_KEY = 'sk_test_smoke_placeholder_no_api_calls';
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_smoke_placeholder_for_hmac_tests';
}
if (!process.env.LEADFLOW_API_KEY) {
  process.env.LEADFLOW_API_KEY = 'test-api-key-stripe-checkout-smoke';
}

// ─── Load server AFTER env is configured ────────────────────────────────────
const assert = require('assert');
const http = require('http');
const Stripe = require('stripe');
const app = require('../../server');

// ─── Test harness ────────────────────────────────────────────────────────────
let passed = 0, failed = 0;

function pass(label) { passed++; console.log(`  ✅ ${label}`); }
function fail(label, reason) { failed++; console.error(`  ❌ ${label}: ${reason}`); }

// Send a POST request. body may be a string (sent as-is) or object (JSON-serialized).
function post(server, urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = typeof body === 'string' ? body : (body !== undefined ? JSON.stringify(body) : '');
    const reqHeaders = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      ...headers,
    };
    const req = http.request(
      { hostname: '127.0.0.1', port: server.address().port, path: urlPath, method: 'POST', headers: reqHeaders },
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

// ─── Tests ──────────────────────────────────────────────────────────────────
async function runTests(server) {
  const apiKey = process.env.LEADFLOW_API_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Test 1 — billing endpoint validates input: missing userId → 400
  console.log('\n[1] Billing endpoint rejects missing userId');
  try {
    const res = await post(server, '/api/billing/checkout', { 'x-api-key': apiKey }, {});
    assert.strictEqual(res.statusCode, 400, `Expected 400, got ${res.statusCode}`);
    assert.ok(res.body && res.body.error, 'Response must have an error field');
    pass('POST /api/billing/checkout — missing userId → 400');
  } catch (e) {
    fail('POST /api/billing/checkout — missing userId → 400', e.message);
  }

  // Test 2 — auth middleware rejects wrong API key → 401
  console.log('\n[2] Billing endpoint rejects invalid API key');
  try {
    const res = await post(server, '/api/billing/checkout', { 'x-api-key': 'wrong-key' }, { userId: 'u1', tier: 'starter' });
    assert.strictEqual(res.statusCode, 401, `Expected 401, got ${res.statusCode}`);
    pass('POST /api/billing/checkout — wrong API key → 401');
  } catch (e) {
    fail('POST /api/billing/checkout — wrong API key → 401', e.message);
  }

  // Test 3 — webhook rejects missing stripe-signature header → 400
  console.log('\n[3] Webhook rejects missing stripe-signature header');
  try {
    const res = await post(server, '/webhook/stripe', {}, { type: 'test.event', data: { object: {} } });
    assert.strictEqual(res.statusCode, 400, `Expected 400, got ${res.statusCode}`);
    pass('POST /webhook/stripe — missing stripe-signature → 400');
  } catch (e) {
    fail('POST /webhook/stripe — missing stripe-signature → 400', e.message);
  }

  // Test 4 — webhook rejects malformed HMAC signature → 400
  // Works with placeholder secret: any wrong signature is rejected regardless.
  console.log('\n[4] Webhook rejects bad HMAC signature');
  try {
    const res = await post(
      server, '/webhook/stripe',
      { 'stripe-signature': 't=1234,v1=0000000000000000000000000000000000000000000000000000000000000000' },
      { type: 'test.event', data: { object: {} } }
    );
    assert.strictEqual(res.statusCode, 400, `Expected 400, got ${res.statusCode}`);
    pass('POST /webhook/stripe — bad HMAC → 400');
  } catch (e) {
    fail('POST /webhook/stripe — bad HMAC → 400', e.message);
  }

  // Test 5 — webhook accepts a validly signed checkout.session.completed event → 200
  // Signs and verifies with the same secret (placeholder or real), so HMAC always matches.
  // The handler processes the event and returns acknowledged:true without hitting Stripe API
  // because no subscription ID is included in the test event.
  console.log('\n[5] Webhook accepts valid signed checkout.session.completed event');
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    const event = {
      id: 'evt_test_smoke_' + Date.now(),
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_smoke',
          object: 'checkout.session',
          client_reference_id: 'genome-onboarded-test-agent',
          metadata: { tier: 'starter', agent_id: 'genome-onboarded-test-agent' },
          payment_status: 'paid',
          status: 'complete',
        },
      },
    };
    const payload = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });
    const res = await post(server, '/webhook/stripe', { 'stripe-signature': signature }, payload);
    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode} — body: ${JSON.stringify(res.body)}`);
    assert.ok(res.body && res.body.received === true, `Expected received:true, got: ${JSON.stringify(res.body)}`);
    pass('POST /webhook/stripe — valid checkout.session.completed event → 200 received:true');
  } catch (e) {
    fail('POST /webhook/stripe — valid checkout.session.completed event → 200', e.message);
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────
const server = app.listen(0, '127.0.0.1', async () => {
  try {
    await runTests(server);
  } finally {
    server.close();
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Tests: ${passed} passed, ${failed} failed`);
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
