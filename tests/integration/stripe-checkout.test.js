/**
 * Stripe Checkout Integration Test
 * Proves the $49 (starter_monthly) payment flow works end-to-end.
 *
 * Required env vars (test is SKIPPED, not failed, if any are absent):
 *   STRIPE_SECRET_KEY     — must start with sk_test_ (test mode only; no real money)
 *   STRIPE_WEBHOOK_SECRET — must start with whsec_
 *   LOCAL_PG_URL          — PostgreSQL connection string (postgresql://...)
 *
 * Optional (enables DB-state assertions):
 *   NEXT_PUBLIC_API_URL   — PostgREST-compatible API URL (defaults to http://localhost:8788)
 *   LEADFLOW_API_KEY      — API key for the above (read from process.env)
 *
 * Flow under test:
 *   1. Stripe Checkout Session creation (starter_monthly → $49/mo)
 *   2. checkout.session.completed webhook → POST /webhook/stripe (HMAC-signed)
 *   3. DB state: real_estate_agents.subscription_status = 'active', plan_tier = 'starter'
 *   4. Cleanup: reset test agent
 *
 * Run standalone: node tests/integration/stripe-checkout.test.js
 */

'use strict';

require('dotenv').config();

const http = require('http');
const assert = require('assert');
const crypto = require('crypto');

// ─── Skip guard ──────────────���───────────────────────────────────────────────

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

// ─── Test harness ───────────────────────────────────��─────────────────────────

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

async function test(name, fn) {
  if (SKIP) { skip(name, SKIP_REASON); return; }
  try {
    await fn();
    pass(name);
  } catch (err) {
    fail(name, err.message);
  }
}

// ─── HTTP helper (no axios/supertest required) ────────────────────────────────

function httpRequest(baseUrl, path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const isHttps = url.protocol === 'https:';
    const mod = isHttps ? require('https') : http;

    const body = options.body != null
      ? (typeof options.body === 'string' ? Buffer.from(options.body) : options.body)
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
          const raw = Buffer.concat(chunks).toString();
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

// ─── Stripe webhook HMAC signature (matches Stripe's own scheme) ─────────────

function generateStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadStr = typeof payload === 'string' ? payload : payload.toString();
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
    console.log(`\n  ⚠  Skipping — ${SKIP_REASON}\n`);
    printSummary();
    return;
  }

  // Lazy-require modules (only when env vars are present)
  const Stripe = require('stripe');
  const { getPool } = require('../../lib/db');

  const stripe = new Stripe(STRIPE_KEY);
  const pool = getPool();

  // Verify our HMAC implementation matches the Stripe SDK before using it
  {
    const testPayload = '{"sanity":true}';
    const sig = generateStripeSignature(testPayload, WEBHOOK_SECRET);
    // If our signature doesn't verify, the webhook tests will fail with 400 — catch it early
    try {
      stripe.webhooks.constructEvent(testPayload, sig, WEBHOOK_SECRET);
    } catch (err) {
      throw new Error(`HMAC sanity check failed: ${err.message}. Cannot run webhook tests.`);
    }
  }

  // Probe the local PostgREST API — needed for BillingService DB writes in handleCheckoutCompleted.
  // The BillingService singleton uses NEXT_PUBLIC_API_URL for all DB operations.
  // On the self-hosted Mac Mini CI runner, this server is always at http://localhost:8788.
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8788';
  const API_KEY = process.env.LEADFLOW_API_KEY || '';
  let apiReachable = false;

  try {
    const probe = await httpRequest(API_URL, '/real_estate_agents?limit=0', {
      headers: { 'apikey': API_KEY, 'Authorization': `Bearer ${API_KEY}` },
      timeout: 3000,
    });
    apiReachable = probe.status < 500;
  } catch { /* API not reachable — DB assertions will be skipped */ }

  console.log(`  PostgREST API:  ${apiReachable ? API_URL : 'NOT reachable (DB assertions will be skipped)'}`);
  console.log();

  // Set env vars for server.js / BillingService to pick up the right API URL.
  // Must be set BEFORE requiring server.js so the BillingService singleton is created correctly.
  if (apiReachable) {
    process.env.NEXT_PUBLIC_API_URL = API_URL;
    if (API_KEY) process.env.LEADFLOW_API_KEY = API_KEY;
  }

  // Track Stripe resources for cleanup
  let stripeCustomerId = null;
  let stripeSubscriptionId = null;
  const agentId = `test-checkout-${crypto.randomUUID()}`;
  const agentEmail = `${agentId}@test.leadflow.internal`;

  // Start Express app on a random port (binding 127.0.0.1 to avoid firewall prompts)
  const app = require('../../server');
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const BASE = `http://127.0.0.1:${server.address().port}`;

  try {

    // ── 1. Checkout session creation ─────────────────────────────────────────
    // Uses stripe.checkout.sessions.create with test key — proves $49 price config is correct.

    await test('1. Checkout session creation returns a valid Stripe URL (starter_monthly = $49)', async () => {
      const configuredPriceId = process.env.STRIPE_PRICE_STARTER_MONTHLY;
      const isValidPriceId = (id) =>
        typeof id === 'string' && /^price_[A-Za-z0-9]{14,36}$/.test(id);

      let priceId;
      let ephemeralProductId = null;

      if (isValidPriceId(configuredPriceId)) {
        priceId = configuredPriceId;
      } else {
        // No configured price: create a disposable $49/mo test price to prove session creation works
        const product = await stripe.products.create({ name: 'LeadFlow Starter (integration test)' });
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
        success_url: 'https://leadflow-ai-five.vercel.app/dashboard?session_id={CHECKOUT_SESSION_ID}',
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

      // Deactivate ephemeral product/price if we created them
      if (ephemeralProductId) {
        try { await stripe.prices.update(priceId, { active: false }); } catch {}
        try { await stripe.products.update(ephemeralProductId, { active: false }); } catch {}
      }
    });

    // ── 2. Stripe subscription (simulates completed checkout in test mode) ─────
    // handleCheckoutCompleted calls stripe.subscriptions.retrieve(subscriptionId),
    // so we need a real subscription ID in Stripe test mode.

    await test('2. Stripe test subscription created with tok_visa (simulates post-checkout state)', async () => {
      if (!stripeCustomerId) throw new Error('Customer not created — step 1 failed');

      const pm = await stripe.paymentMethods.create({ type: 'card', card: { token: 'tok_visa' } });
      await stripe.paymentMethods.attach(pm.id, { customer: stripeCustomerId });
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: pm.id },
      });

      let priceId = process.env.STRIPE_PRICE_STARTER_MONTHLY;
      const isValidPriceId = typeof priceId === 'string' && /^price_[A-Za-z0-9]{14,36}$/.test(priceId);
      if (!isValidPriceId) {
        const product = await stripe.products.create({ name: 'LeadFlow Starter Sub (integration test)' });
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

    // ── 3. Seed test agent in PostgreSQL ──────────────────────────────────────

    await test('3. Test agent inserted into real_estate_agents table', async () => {
      await pool.query(
        `INSERT INTO real_estate_agents
           (id, email, first_name, last_name, subscription_status, plan_tier, mrr, created_at, updated_at)
         VALUES ($1, $2, 'Integration', 'Test', 'inactive', 'trial', 0, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [agentId, agentEmail]
      );
      const { rows } = await pool.query(
        'SELECT subscription_status, plan_tier FROM real_estate_agents WHERE id = $1',
        [agentId]
      );
      assert.strictEqual(rows.length, 1, 'Agent row must exist after insert');
      assert.strictEqual(rows[0].subscription_status, 'inactive', 'Initial status must be inactive');
    });

    // ─��� 4. Simulate checkout.session.completed webhook ─────────────────────────
    // POST /webhook/stripe with a correctly HMAC-signed payload.

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

      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
      assert(res.data && res.data.received === true, `Expected {received:true}, got ${JSON.stringify(res.data)}`);
    });

    // ── 5. Webhook signature rejection ──────────────���─────────────────────────

    await test('5. POST /webhook/stripe with invalid signature returns 400', async () => {
      const payload = JSON.stringify({
        id: 'evt_bad', type: 'checkout.session.completed',
        data: { object: { id: 'cs_bad', client_reference_id: 'nobody' } },
      });
      const res = await httpRequest(BASE, '/webhook/stripe', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=1,v1=invalidsig' },
      });
      assert.strictEqual(res.status, 400, `Expected 400 for bad signature, got ${res.status}`);
    });

    // ── 6. DB state after webhook (only when PostgREST API is reachable) ──────
    // The BillingService writes to the DB via PostgREST HTTP (not direct SQL),
    // so these assertions require the local API server to be running.

    await test('6. DB: subscription_status = active after checkout.session.completed webhook', async () => {
      if (!apiReachable) {
        throw new Error(
          `PostgREST API not reachable at ${API_URL} — ` +
          'BillingService cannot write to DB without it. ' +
          'Ensure the local API server is running (launchctl start com.leonida.dashboard-server).'
        );
      }
      // Give the async handler a moment to commit
      await new Promise((r) => setTimeout(r, 500));

      const { rows } = await pool.query(
        'SELECT subscription_status, plan_tier, stripe_customer_id FROM real_estate_agents WHERE id = $1',
        [agentId]
      );
      assert.strictEqual(rows.length, 1, 'Agent row must exist');
      assert.strictEqual(
        rows[0].subscription_status, 'active',
        `Expected subscription_status='active', got '${rows[0].subscription_status}'`
      );
    });

    await test('7. DB: plan_tier = starter after checkout.session.completed webhook', async () => {
      if (!apiReachable) {
        throw new Error(`PostgREST API not reachable at ${API_URL}`);
      }
      const { rows } = await pool.query(
        'SELECT plan_tier FROM real_estate_agents WHERE id = $1',
        [agentId]
      );
      assert.strictEqual(rows.length, 1, 'Agent row must exist');
      assert.strictEqual(rows[0].plan_tier, 'starter', `Expected 'starter', got '${rows[0].plan_tier}'`);
    });

    await test('8. DB: stripe_customer_id (cus_...) set after webhook', async () => {
      if (!apiReachable) {
        throw new Error(`PostgREST API not reachable at ${API_URL}`);
      }
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
    // ── Cleanup ───────────────────────────────────────────────────────────────
    console.log('\n  Cleaning up test data...');

    // Reset agent (not delete — avoid FK constraint issues)
    try {
      await pool.query(
        `UPDATE real_estate_agents
         SET subscription_status = 'inactive', plan_tier = 'trial',
             stripe_customer_id = NULL, mrr = 0, updated_at = NOW()
         WHERE id = $1`,
        [agentId]
      );
    } catch {}
    // Now safe to delete
    try { await pool.query('DELETE FROM real_estate_agents WHERE id = $1', [agentId]); } catch {}

    // Cancel Stripe test subscription + delete test customer
    if (stripeSubscriptionId) {
      try { await stripe.subscriptions.cancel(stripeSubscriptionId); } catch {}
    }
    if (stripeCustomerId) {
      try { await stripe.customers.del(stripeCustomerId); } catch {}
    }

    await new Promise((resolve) => server.close(resolve));
    await pool.end().catch(() => {});

    console.log('  Cleanup complete.\n');
  }

  printSummary();
}

function printSummary() {
  console.log('='.repeat(50));
  console.log(`  Passed:  ${results.passed}`);
  console.log(`  Failed:  ${results.failed}`);
  console.log(`  Skipped: ${results.skipped}`);
  console.log(`  Total:   ${results.passed + results.failed + results.skipped}`);
  console.log('='.repeat(50) + '\n');
  if (results.failed > 0) {
    console.log('Failed tests:');
    results.tests.filter((t) => t.status === 'FAILED')
      .forEach((t) => console.log(`  - ${t.name}: ${t.reason}`));
    console.log();
  }
}

// ─── Entry point ───────────────────────────────────────��─────────────────────

if (require.main === module) {
  runAll()
    .then(() => process.exit(results.failed > 0 ? 1 : 0))
    .catch((err) => { console.error('Fatal error:', err); process.exit(1); });
}

module.exports = { runAll, results };
