'use strict';

/**
 * Unit tests for BillingService webhook handler persistence.
 *
 * Verifies that checkout.session.completed and customer.subscription.*
 * events correctly write to the subscriptions table via the db client.
 *
 * Uses a mock db client so no real DB connection is required.
 */

const assert = require('assert');

// ─── Minimal mock db client ───────────────────────────────────────────────────

class MockDb {
  constructor() {
    this.subscriptions = [];
    this.agents = [];
    this.subscriptionEvents = [];
    this.payments = [];
    this.checkoutSessions = [];
  }

  from(table) {
    const store = this._storeFor(table);
    return new MockQueryBuilder(store, table);
  }

  _storeFor(table) {
    const map = {
      subscriptions: this.subscriptions,
      real_estate_agents: this.agents,
      subscription_events: this.subscriptionEvents,
      payments: this.payments,
      checkout_sessions: this.checkoutSessions,
    };
    if (!map[table]) map[table] = [];
    return map[table];
  }
}

// Lazy query builder — matches the real lib/db.js QueryBuilder's thenable pattern.
// All methods set state and return `this`; execution happens when awaited via then().
class MockQueryBuilder {
  constructor(store) {
    this._store = store;
    this._filters = {};
    this._op = null;      // 'insert' | 'upsert' | 'update' | 'select'
    this._opData = null;
    this._upsertOpts = {};
    this._singleVal = false;
  }

  select() { this._op = 'select'; return this; }

  eq(col, val) { this._filters[col] = val; return this; }

  single() { this._singleVal = true; return this; }

  insert(data) {
    this._op = 'insert';
    this._opData = Array.isArray(data) ? data[0] : data;
    return this;
  }

  upsert(data, opts = {}) {
    this._op = 'upsert';
    this._opData = data;
    this._upsertOpts = opts;
    return this;
  }

  update(data) {
    this._op = 'update';
    this._opData = data;
    return this;
  }

  _matchesFilters(row) {
    return Object.entries(this._filters).every(([k, v]) => row[k] === v);
  }

  _execute() {
    if (this._op === 'insert') {
      this._store.push(this._opData);
      return { data: [this._opData], error: null };
    }

    if (this._op === 'upsert') {
      const rows = Array.isArray(this._opData) ? this._opData : [this._opData];
      const conflictCol = this._upsertOpts.onConflict;
      for (const row of rows) {
        const idx = conflictCol ? this._store.findIndex(r => r[conflictCol] === row[conflictCol]) : -1;
        if (idx >= 0) Object.assign(this._store[idx], row);
        else this._store.push(row);
      }
      return { data: rows, error: null };
    }

    if (this._op === 'update') {
      for (const row of this._store) {
        if (this._matchesFilters(row)) Object.assign(row, this._opData);
      }
      return { data: this._opData, error: null };
    }

    // select
    const results = this._store.filter(r => this._matchesFilters(r));
    if (this._singleVal) {
      return { data: results[0] || null, error: null };
    }
    return { data: results, error: null };
  }

  // Thenable — awaiting executes the query
  then(onfulfilled, onrejected) {
    return Promise.resolve(this._execute()).then(onfulfilled, onrejected);
  }
}

// ─── Mock Stripe client ───────────────────────────────────────────────────────

function makeMockStripe(subData) {
  return {
    subscriptions: {
      retrieve: async () => subData,
    },
    webhooks: {
      constructEvent: (_payload, _sig, _secret) => { throw new Error('Mock: use verifyWebhookSignature mock'); },
    },
  };
}

// ─── Fixture builders ─────────────────────────────────────────────────────────

function makeStripeSubscription(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: 'sub_test_001',
    customer: 'cus_test_001',
    status: 'active',
    items: { data: [{ price: { id: 'price_test_001', recurring: { interval: 'month' } } }] },
    current_period_start: now - 86400,
    current_period_end: now + 86400 * 29,
    trial_start: null,
    trial_end: null,
    cancel_at_period_end: false,
    canceled_at: null,
    ended_at: null,
    metadata: { user_id: 'user_abc123', tier: 'pro' },
    ...overrides,
  };
}

function makeCheckoutSession(overrides = {}) {
  return {
    id: 'cs_test_001',
    client_reference_id: 'user_abc123',
    customer: 'cus_test_001',
    subscription: 'sub_test_001',
    metadata: { tier: 'pro' },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

async function run() {
  // Require after process.env is set to avoid startup crash on missing STRIPE_SECRET_KEY
  process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
  process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';
  const { BillingService } = require('../../lib/services/BillingService');

  console.log('\nBillingService — webhook persistence\n');

  // ── db initialization ─────────────────────────────────────────────────────
  await test('db is initialized even without NEXT_PUBLIC_API_URL', () => {
    const saved = process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    const svc = new BillingService({ stripe: null });
    assert(svc.db !== null, 'this.db must not be null when NEXT_PUBLIC_API_URL is absent');
    assert(typeof svc.db.from === 'function', 'this.db must expose a .from() method');
    process.env.NEXT_PUBLIC_API_URL = saved;
  });

  await test('db accepts injected client via options.db', () => {
    const mockDb = new MockDb();
    const svc = new BillingService({ stripe: null, db: mockDb });
    assert(svc.db === mockDb, 'options.db must override default db client');
  });

  // ── checkout.session.completed ────────────────────────────────────────────
  await test('handleCheckoutCompleted upserts subscription row', async () => {
    const db = new MockDb();
    const stripeSub = makeStripeSubscription();
    const svc = new BillingService({ db, stripe: makeMockStripe(stripeSub) });

    await svc.handleCheckoutCompleted(makeCheckoutSession());

    assert(db.subscriptions.length === 1, `Expected 1 subscription row, got ${db.subscriptions.length}`);
    const row = db.subscriptions[0];
    assert.strictEqual(row.stripe_subscription_id, 'sub_test_001');
    assert.strictEqual(row.stripe_customer_id, 'cus_test_001');
    assert.strictEqual(row.user_id, 'user_abc123');
    assert.strictEqual(row.status, 'active');
    assert.strictEqual(row.tier, 'pro');
    assert.strictEqual(row.price_id, 'price_test_001');
    assert.strictEqual(row.interval, 'month');
    assert(row.current_period_start instanceof Date, 'current_period_start must be a Date');
    assert(row.current_period_end instanceof Date, 'current_period_end must be a Date');
  });

  await test('handleCheckoutCompleted updates real_estate_agents row', async () => {
    const db = new MockDb();
    // Pre-seed agent so the UPDATE can match by id
    db.agents.push({ id: 'user_abc123', subscription_status: 'inactive', plan_tier: null });
    const svc = new BillingService({ db, stripe: makeMockStripe(makeStripeSubscription()) });

    await svc.handleCheckoutCompleted(makeCheckoutSession());

    const agent = db.agents.find(a => a.id === 'user_abc123');
    assert(agent, 'Agent row must exist');
    assert.strictEqual(agent.stripe_customer_id, 'cus_test_001');
    assert.strictEqual(agent.subscription_status, 'active');
    assert.strictEqual(agent.plan_tier, 'pro');
  });

  await test('handleCheckoutCompleted is a no-op when userId is absent', async () => {
    const db = new MockDb();
    const svc = new BillingService({ db, stripe: makeMockStripe(makeStripeSubscription()) });

    await svc.handleCheckoutCompleted({ id: 'cs_no_user', customer: 'cus_001', subscription: 'sub_001', metadata: {} });

    assert.strictEqual(db.subscriptions.length, 0, 'No subscription row should be written without userId');
  });

  // ── customer.subscription.created ────────────────────────────────────────
  await test('handleSubscriptionCreated upserts subscription row', async () => {
    const db = new MockDb();
    const svc = new BillingService({ db, stripe: null });
    const sub = makeStripeSubscription();

    await svc.handleSubscriptionCreated(sub);

    assert(db.subscriptions.length === 1, `Expected 1 subscription row, got ${db.subscriptions.length}`);
    const row = db.subscriptions[0];
    assert.strictEqual(row.stripe_subscription_id, sub.id);
    assert.strictEqual(row.stripe_customer_id, sub.customer);
  });

  await test('handleSubscriptionUpdated upserts subscription row', async () => {
    const db = new MockDb();
    const svc = new BillingService({ db, stripe: null });
    const sub = makeStripeSubscription({ status: 'past_due' });

    await svc.handleSubscriptionUpdated(sub);

    assert(db.subscriptions.length === 1, 'Expected 1 subscription row');
    assert.strictEqual(db.subscriptions[0].status, 'past_due');
  });

  await test('handleSubscriptionDeleted marks subscription canceled', async () => {
    const db = new MockDb();
    db.subscriptions.push({ id: 'sub_test_001', stripe_subscription_id: 'sub_test_001', status: 'active' });
    const svc = new BillingService({ db, stripe: null });
    const sub = makeStripeSubscription({ status: 'canceled', ended_at: Math.floor(Date.now() / 1000) });

    await svc.handleSubscriptionDeleted(sub);

    const row = db.subscriptions[0];
    assert.strictEqual(row.status, 'canceled', 'Row status must be updated to canceled');
  });

  // ── processWebhookEvent dispatch ─────────────────────────────────────────
  await test('processWebhookEvent routes checkout.session.completed correctly', async () => {
    const db = new MockDb();
    const svc = new BillingService({ db, stripe: makeMockStripe(makeStripeSubscription()) });
    const event = { id: 'evt_001', type: 'checkout.session.completed', data: { object: makeCheckoutSession() } };

    const result = await svc.processWebhookEvent(event);

    assert.strictEqual(result.type, 'checkout.session.completed');
    assert.strictEqual(result.processed, true);
  });

  await test('processWebhookEvent routes customer.subscription.created correctly', async () => {
    const db = new MockDb();
    const svc = new BillingService({ db, stripe: null });
    const event = { id: 'evt_002', type: 'customer.subscription.created', data: { object: makeStripeSubscription() } };

    const result = await svc.processWebhookEvent(event);

    assert.strictEqual(result.type, 'customer.subscription.created');
    assert.strictEqual(result.processed, true);
  });

  await test('processWebhookEvent returns processed:false for unhandled event type', async () => {
    const db = new MockDb();
    const svc = new BillingService({ db, stripe: null });
    const event = { id: 'evt_003', type: 'some.unknown.event', data: { object: {} } };

    const result = await svc.processWebhookEvent(event);

    assert.strictEqual(result.processed, false);
  });

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  run().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { run };
