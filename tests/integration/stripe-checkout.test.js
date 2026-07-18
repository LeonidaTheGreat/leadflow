/**
 * Stripe Checkout Integration Test
 * Proves the $49 (starter_monthly) payment flow works end-to-end.
 *
 * Required env vars (test SKIPS, does not fail, when any are absent):
 *   STRIPE_SECRET_KEY     — must start with sk_test_ (test mode only; no real charges)
 *   STRIPE_WEBHOOK_SECRET — must start with whsec_
 *   LOCAL_PG_URL          — PostgreSQL connection string (postgresql://...)
 *
 * DB assertion tests (7–9) additionally require the PostgREST API to be reachable.
 * They are SKIPPED (not failed) when PostgREST is unavailable.
 *   NEXT_PUBLIC_API_URL   — PostgREST URL (defaults to http://localhost:8788)
 *   LEADFLOW_API_KEY      — API key for PostgREST
 *
 * Flow under test:
 *   1. Stripe Checkout Session creation (starter_monthly → $49/mo)
 *   2. Stripe test subscription (simulates post-checkout Stripe state)
 *   3. Test agent seeded into real_estate_agents
 *   4. checkout.session.completed webhook → POST /webhook/stripe (HMAC-signed)
 *   5. Webhook signature rejection (bad sig → 400)
 *   6a–6b. HMAC edge cases (empty payload, Unicode payload)
 *   7–9. DB state assertions (subscription_status, plan_tier, stripe_customer_id)
 *
 * Run standalone: node tests/integration/stripe-checkout.test.js
 * Run via npm:    npm run test:stripe-checkout
 */

'use strict';

// ── Must be set before any require('../../server') to prevent server.js from
// auto-listening on port 3000 (it listens when NODE_ENV !== 'production').
process.env.NODE_ENV = 'test';

// dotenv is an optional loader — fall back gracefully if not installed
try { require('dotenv').config(); } catch {}

const http = require('http');
const assert = require('assert');
const crypto = require('crypto');

// ─── Skip guard ───────────────────────────────────────────────────────────────

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const PG_URL = process.env.LOCAL_PG_URL || '';

const SKIP =
  !STRIPE_KEY.startsWith('sk_test_') ||
  !WEBHOOK_SECRET.startsWith('whsec_') ||
  !PG_URL;

const SKIP_REASON = !STRIPE_KEY.startsWith('sk_test_')
  ? 'STRIPE_SECRET_KEY missing or not a test key (must start with sk_test_)'
  : !WEBHOOK_SECRET.startsWith('whsec_')
  ? 'STRIPE_WEBHOOK_SECRET missing or invalid (must start with whsec_)'
  : 'LOCAL_PG_URL not set';

// ─── Test harness ─────────────────────────────────────────────────────────────

const results = { passed: 0, failed: 0, skipped: 0, tests: [] };

function pass(name) {
  results.passed++;
  results.tests.push({ name, status: 'PASSED' });
  console.log(`  PASS  ${name}`);
}

function fail(name, reason) {
  results.failed++;
  results.tests.push({ name, status: 'FAILED', reason });
  console.error(`  FAIL  ${name}: ${reason}`);
}

function skip(name, reason) {
  results.skipped++;
  results.tests.push({ name, status: 'SKIPPED', reason });
  console.log(`  SKIP  ${name} [${reason}]`);
}

// Throw this inside a test() callback to skip (not fail) the test.
function skipTest(reason) {
  const e = new Error(reason);
  e._skipTest = true;
  throw e;
}

async function test(name, fn) {
  if (SKIP) { skip(name, SKIP_REASON); return; }
  try {
    await fn();
    pass(name);
  } catch (err) {
    if (err && err._skipTest) {
      skip(name, err.message);
    } else {
      fail(name, err.message || String(err));
    }
  }
}

// ─── HTTP helper (no axios/supertest required) ────────────────────────────────

function httpRequest(baseUrl, path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const isHttps = url.protocol === 'https:';
    const mod = isHttps ? require('https') : http;

    const body = options.body != null
      ? (Buffer.isBuffer(options.body)
          ? options.body
          : Buffer.from(typeof options.body === 'string' ? options.body : JSON.stringify(options.body)))
      : null;

    const req = mod.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': body.length } : {}),
          ...(options.headers || {}),
        },
        timeout: options.timeout || 10000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let data = raw;
          try { data = JSON.parse(raw); } catch {}
          resolve({ status: res.statusCode, data, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Request to ${url} timed out`)); });
    if (body) req.write(body);
    req.end();
  });
}

// ─── Stripe webhook HMAC signature ───────────────────────────────────────────
// Stripe signs: HMAC_SHA256(secret, "{unix_ts}.{payload_utf8}")
// Header format: t={unix_ts},v1={hex_hmac}

function generateStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadStr = Buffer.isBuffer(payload) ? payload.toString('utf8') : String(payload);
  const signed = `${timestamp}.${payloadStr}`;
  const sig = crypto.createHmac('sha256', secret).update(signed, 'utf8').digest('hex');
  return `t=${timestamp},v1=${sig}`;
}

// ─── Main test suite ──────────────────────────────────────────────────────────

async function runAll() {
  console.log('\n=== Stripe Checkout Integration Test ===\n');
  console.log(`  Stripe key:     ${STRIPE_KEY ? STRIPE_KEY.slice(0, 14) + '...' : 'NOT SET'}`);
  console.log(`  Webhook secret: ${WEBHOOK_SECRET ? 'configured' : 'NOT SET'}`);
  console.log(`  PostgreSQL:     ${PG_URL ? 'configured' : 'NOT SET'}`);

  if (SKIP) {
    console.log(`\n  All 9 tests SKIPPED — ${SKIP_REASON}`);
    console.log('  Set STRIPE_SECRET_KEY (sk_test_...), STRIPE_WEBHOOK_SECRET (whsec_...), LOCAL_PG_URL to run.\n');
    printSummary(9);
    return;
  }

  const Stripe = require('stripe');
  const { getPool } = require('../../lib/db');

  const stripe = new Stripe(STRIPE_KEY);
  const pool = getPool();

  // ── HMAC sanity check before starting the server ──────────────────────────
  // A mismatch here would make all webhook tests return 400 instead of 200.
  {
    const testPayload = '{"sanity":true}';
    const sig = generateStripeSignature(testPayload, WEBHOOK_SECRET);
    try {
      stripe.webhooks.constructEvent(testPayload, sig, WEBHOOK_SECRET);
    } catch (err) {
      throw new Error(
        `HMAC sanity-check failed: ${err.message}. ` +
        'Our signature scheme does not match Stripe SDK — cannot continue.'
      );
    }
  }

  // ── PostgREST probe (needed for BillingService DB writes) ─────────────────
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8788';
  const API_KEY = process.env.LEADFLOW_API_KEY || '';
  let apiReachable = false;
  try {
    const probe = await httpRequest(API_URL, '/real_estate_agents?limit=0', {
      headers: { apikey: API_KEY, Authorization: `Bearer ${API_KEY}` },
      timeout: 3000,
    });
    apiReachable = probe.status < 500;
  } catch { /* unreachable — DB assertion tests will skip */ }

  console.log(
    `  PostgREST API:  ${apiReachable ? API_URL : 'NOT reachable (DB assertion tests 7–9 will be skipped)'}`
  );
  console.log();

  // Set env vars before requiring server.js so BillingService singleton reads
  // the correct NEXT_PUBLIC_API_URL when the module is first required.
  if (apiReachable) {
    process.env.NEXT_PUBLIC_API_URL = API_URL;
    if (API_KEY) process.env.LEADFLOW_API_KEY = API_KEY;
  }

  // ── Start Express app on an OS-assigned port (port 0) ────────────────────
  // - NODE_ENV=test (set above) prevents server.js from auto-listening on 3000
  // - port 0 = OS picks a free port → no conflicts in concurrent CI runs
  // - server.close() is called in the finally block below (always runs)
  const app = require('../../server');
  let server;
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', (err) => {
      if (err) reject(err); else resolve();
    });
  });
  const BASE = `http://127.0.0.1:${server.address().port}`;

  let stripeCustomerId = null;
  let stripeSubscriptionId = null;
  const agentId = `test-checkout-${crypto.randomUUID()}`;
  const agentEmail = `${agentId}@test.leadflow.internal`;

  try {

    // ── 1. Checkout session creation ─────────────────────────────────────────

    await test('1. Checkout session creation returns a valid Stripe URL (starter_monthly = $49)', async () => {
      const configuredPriceId = process.env.STRIPE_PRICE_STARTER_MONTHLY;
      const isValidPriceId = (id) =>
        typeof id === 'string' && /^price_[A-Za-z0-9]{14,36}$/.test(id);

      let priceId;
      let ephemeralProductId = null;

      if (isValidPriceId(configuredPriceId)) {
        priceId = configuredPriceId;
      } else {
        const product = await stripe.products.create({
          name: 'LeadFlow Starter (integration-test ephemeral)',
        });
        ephemeralProductId = product.id;
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: 4900,
          currency: 'usd',
          recurring: { interval: 'month' },
        });
        priceId = price.id;
      }

      const customer = await stripe.customers.create({
        email: agentEmail,
        metadata: { agent_id: agentId, source: 'integration_test' },
      });
      stripeCustomerId = customer.id;

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        client_reference_id: agentId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url:
          'https://leadflow-ai-five.vercel.app/dashboard?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://leadflow-ai-five.vercel.app/pricing?cancelled=true',
        metadata: { agent_id: agentId, tier: 'starter', source: 'integration_test' },
      });

      assert(session.id, 'Session must have an id');
      assert(session.url, 'Session must have a url');
      assert(
        session.url.startsWith('https://checkout.stripe.com/'),
        `Expected checkout.stripe.com URL, got: ${session.url}`
      );
      assert.strictEqual(session.client_reference_id, agentId, 'client_reference_id must match agentId');
      assert.strictEqual(session.mode, 'subscription', 'Session must be subscription mode');

      if (ephemeralProductId) {
        try { await stripe.prices.update(priceId, { active: false }); } catch {}
        try { await stripe.products.update(ephemeralProductId, { active: false }); } catch {}
      }
    });

    // ── 2. Stripe test subscription ───────────────────────────────────────────

    await test('2. Stripe test subscription created (simulates post-checkout state)', async () => {
      if (!stripeCustomerId) throw new Error('Customer not created — step 1 failed');

      const pm = await stripe.paymentMethods.create({ type: 'card', card: { token: 'tok_visa' } });
      await stripe.paymentMethods.attach(pm.id, { customer: stripeCustomerId });
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: pm.id },
      });

      let priceId = process.env.STRIPE_PRICE_STARTER_MONTHLY;
      const isValidPriceId =
        typeof priceId === 'string' && /^price_[A-Za-z0-9]{14,36}$/.test(priceId);

      if (!isValidPriceId) {
        const product = await stripe.products.create({
          name: 'LeadFlow Starter Sub (integration-test ephemeral)',
        });
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: 4900,
          currency: 'usd',
          recurring: { interval: 'month' },
        });
        priceId = price.id;
      }

      const sub = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        metadata: { agent_id: agentId, tier: 'starter', source: 'integration_test' },
      });

      assert(sub.id, 'Subscription must have an id');
      assert(
        ['active', 'trialing'].includes(sub.status),
        `Expected active/trialing status, got: ${sub.status}`
      );
      stripeSubscriptionId = sub.id;
    });

    // ── 3. Seed test agent ────────────────────────────────────────────────────

    await test('3. Test agent seeded into real_estate_agents', async () => {
      await pool.query(
        `INSERT INTO real_estate_agents
           (id, email, first_name, last_name, subscription_status, plan_tier, mrr, created_at, updated_at)
         VALUES ($1, $2, 'Integration', 'Test', 'inactive', 'trial', 0, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [agentId, agentEmail]
      );
      const { rows } = await pool.query(
        'SELECT subscription_status FROM real_estate_agents WHERE id = $1',
        [agentId]
      );
      assert.strictEqual(rows.length, 1, 'Agent row must exist after insert');
      assert.strictEqual(rows[0].subscription_status, 'inactive', 'Initial status must be inactive');
    });

    // ── 4. Valid webhook → 200 ────────────────────────────────────────────────

    await test('4. POST /webhook/stripe (checkout.session.completed) returns 200 + {received:true}', async () => {
      if (!stripeCustomerId || !stripeSubscriptionId) {
        throw new Error('Prerequisites not met — steps 1–2 failed');
      }

      const event = {
        id: `evt_test_${crypto.randomBytes(12).toString('hex')}`,
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: `cs_test_${crypto.randomBytes(12).toString('hex')}`,
            object: 'checkout.session',
            client_reference_id: agentId,
            customer: stripeCustomerId,
            subscription: stripeSubscriptionId,
            payment_status: 'paid',
            status: 'complete',
            mode: 'subscription',
            metadata: { agent_id: agentId, tier: 'starter', source: 'integration_test' },
          },
        },
      };

      const payload = JSON.stringify(event);
      const signature = generateStripeSignature(payload, WEBHOOK_SECRET);

      const res = await httpRequest(BASE, '/webhook/stripe', {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
      });

      assert.strictEqual(
        res.status, 200,
        `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`
      );
      assert(
        res.data && res.data.received === true,
        `Expected {received:true}, got ${JSON.stringify(res.data)}`
      );
    });

    // ── 5. Invalid signature → 400 ────────────────────────────────────────────

    await test('5. POST /webhook/stripe with invalid signature returns 400', async () => {
      const payload = JSON.stringify({
        id: 'evt_bad',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_bad', client_reference_id: 'nobody' } },
      });
      const res = await httpRequest(BASE, '/webhook/stripe', {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1,v1=invalidsignature000000000000000',
        },
      });
      assert.strictEqual(res.status, 400, `Expected 400 for bad signature, got ${res.status}`);
    });

    // ── 6a. HMAC edge case: empty JSON payload ────────────────────────────────
    // Verifies our HMAC impl handles empty-ish payloads correctly.
    // The server must return 400 because the event lacks a `type` field,
    // NOT because signature verification failed.

    await test('6a. HMAC edge case: empty payload ({}) — signature valid, event rejected (400)', async () => {
      const payload = '{}';
      const signature = generateStripeSignature(payload, WEBHOOK_SECRET);
      // Confirm our signature matches the Stripe SDK for this payload
      try {
        stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);
      } catch (err) {
        throw new Error(`HMAC verification failed for empty payload: ${err.message}`);
      }
      // Server returns 400 for missing `type`, not HMAC failure (which would also be 400
      // but with a different error message)
      const res = await httpRequest(BASE, '/webhook/stripe', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json', 'stripe-signature': signature },
      });
      assert.strictEqual(
        res.status, 400,
        `Expected 400 (invalid event shape), got ${res.status}: ${JSON.stringify(res.data)}`
      );
      // Ensure the rejection is for event structure, not HMAC (HMAC error message contains "signature")
      const msg = typeof res.data === 'object' ? (res.data.error || '') : String(res.data);
      assert(
        !msg.toLowerCase().includes('signature'),
        `Expected event-structure rejection, got HMAC error: ${msg}`
      );
    });

    // ── 6b. HMAC edge case: Unicode payload ───────────────────────────────────

    await test('6b. HMAC edge case: Unicode payload — signature matches Stripe SDK', async () => {
      const payload = JSON.stringify({ type: 'test.ping', note: 'café — naïve — 日本語' });
      const signature = generateStripeSignature(payload, WEBHOOK_SECRET);
      try {
        stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);
      } catch (err) {
        throw new Error(`HMAC verification failed for Unicode payload: ${err.message}`);
      }
    });

    // ── 7. DB: subscription_status = active ───────────────────────────────────

    await test('7. DB: subscription_status = active after checkout.session.completed webhook', async () => {
      if (!apiReachable) skipTest(`PostgREST not reachable at ${API_URL} — BillingService cannot write to DB`);
      await new Promise((r) => setTimeout(r, 600));
      const { rows } = await pool.query(
        'SELECT subscription_status FROM real_estate_agents WHERE id = $1',
        [agentId]
      );
      assert.strictEqual(rows.length, 1, 'Agent row must exist');
      assert.strictEqual(
        rows[0].subscription_status, 'active',
        `Expected 'active', got '${rows[0].subscription_status}'`
      );
    });

    // ── 8. DB: plan_tier = starter ────────────────────────────────────────────

    await test('8. DB: plan_tier = starter after webhook', async () => {
      if (!apiReachable) skipTest(`PostgREST not reachable at ${API_URL}`);
      const { rows } = await pool.query(
        'SELECT plan_tier FROM real_estate_agents WHERE id = $1',
        [agentId]
      );
      assert.strictEqual(rows.length, 1, 'Agent row must exist');
      assert.strictEqual(rows[0].plan_tier, 'starter', `Expected 'starter', got '${rows[0].plan_tier}'`);
    });

    // ── 9. DB: stripe_customer_id set ─────────────────────────────────────────

    await test('9. DB: stripe_customer_id (cus_...) populated after webhook', async () => {
      if (!apiReachable) skipTest(`PostgREST not reachable at ${API_URL}`);
      const { rows } = await pool.query(
        'SELECT stripe_customer_id FROM real_estate_agents WHERE id = $1',
        [agentId]
      );
      assert.strictEqual(rows.length, 1, 'Agent row must exist');
      assert(rows[0].stripe_customer_id, 'stripe_customer_id must be set');
      assert(
        rows[0].stripe_customer_id.startsWith('cus_'),
        `Expected cus_... prefix, got '${rows[0].stripe_customer_id}'`
      );
    });

  } finally {
    console.log('\n  Cleaning up test data...');

    // Reset agent before deleting to avoid FK constraint issues
    try {
      await pool.query(
        `UPDATE real_estate_agents
         SET subscription_status = 'inactive', plan_tier = 'trial',
             stripe_customer_id = NULL, mrr = 0, updated_at = NOW()
         WHERE id = $1`,
        [agentId]
      );
    } catch {}
    try {
      await pool.query('DELETE FROM real_estate_agents WHERE id = $1', [agentId]);
    } catch {}

    if (stripeSubscriptionId) {
      try { await stripe.subscriptions.cancel(stripeSubscriptionId); } catch {}
    }
    if (stripeCustomerId) {
      try { await stripe.customers.del(stripeCustomerId); } catch {}
    }

    // Close test server BEFORE ending the pool so in-flight requests finish cleanly
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    try { await pool.end(); } catch {}

    console.log('  Cleanup complete.\n');
  }

  printSummary();
}

function printSummary(totalOverride) {
  const total = totalOverride ?? (results.passed + results.failed + results.skipped);
  const skipped = totalOverride ?? results.skipped;
  console.log('='.repeat(50));
  console.log(`  Passed:  ${results.passed}`);
  console.log(`  Failed:  ${results.failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total:   ${total}`);
  console.log('='.repeat(50) + '\n');
  if (results.failed > 0) {
    console.log('Failed tests:');
    results.tests
      .filter((t) => t.status === 'FAILED')
      .forEach((t) => console.log(`  - ${t.name}: ${t.reason}`));
    console.log();
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

if (require.main === module) {
  runAll()
    .then(() => process.exit(results.failed > 0 ? 1 : 0))
    .catch((err) => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runAll, results };
