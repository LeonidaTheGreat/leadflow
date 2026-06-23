'use strict';

/**
 * Unit tests for AdminPilotsService and admin-pilots route
 *
 * Covers:
 *  - getPilotList returns formatted pilot data
 *  - generatePaymentLink validates Stripe config and builds correct session
 *  - logContact validates required fields and writes to DB
 *  - updateOutreachStatus validates status and handles not-found
 *  - Route auth: 401 without API key
 */

const assert = require('assert');
const AdminPilotsService = require('../../lib/services/AdminPilotsService');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL: ${name}: ${err.message}`);
    failed++;
  }
}

/** Minimal mock pool builder */
function makePool(rowSets = [], opts = {}) {
  const queries = [];
  let callIdx = 0;
  return {
    queries,
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (opts.throws) throw new Error(opts.throws);
      const rows = Array.isArray(rowSets[callIdx]) ? rowSets[callIdx] : rowSets;
      callIdx++;
      return { rows: rows || [] };
    },
  };
}

/** Mock Stripe that captures calls */
function makeStripe(opts = {}) {
  return {
    checkout: {
      sessions: {
        create: async (params) => {
          if (opts.checkoutThrows) throw new Error(opts.checkoutThrows);
          return {
            id: 'cs_test_abc123',
            url: 'https://checkout.stripe.com/pay/cs_test_abc123',
            ...params,
          };
        },
      },
    },
  };
}

async function run() {
  console.log('\n=== unit: AdminPilotsService ===\n');

  // ── getPilotList ──────────────────────────────────────────────────────────

  await check('getPilotList returns formatted pilots', async () => {
    const fakeRows = [
      {
        id: 'agent-1',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone_number: '+15550001111',
        created_at: new Date('2026-01-15'),
        last_login_at: new Date('2026-06-01'),
        plan_tier: null,
        onboarding_step: 2,
        status: 'onboarding',
        email_verified: true,
        subscription_status: 'inactive',
        outreach_status: 'contacted',
      },
    ];
    const pool = makePool([fakeRows]);
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    const pilots = await svc.getPilotList();
    assert.strictEqual(pilots.length, 1);
    assert.strictEqual(pilots[0].name, 'Jane Doe');
    assert.strictEqual(pilots[0].email, 'jane@example.com');
    assert.strictEqual(pilots[0].phone, '+15550001111');
    assert.strictEqual(pilots[0].onboarding_step, 2);
    assert.strictEqual(pilots[0].outreach_status, 'contacted');
  });

  await check('getPilotList handles null optional fields', async () => {
    const fakeRows = [
      {
        id: 'agent-2',
        first_name: 'Bob',
        last_name: null,
        email: 'bob@example.com',
        phone_number: null,
        created_at: new Date('2026-02-01'),
        last_login_at: null,
        plan_tier: null,
        onboarding_step: null,
        status: null,
        email_verified: true,
        subscription_status: null,
        outreach_status: null,
      },
    ];
    const pool = makePool([fakeRows]);
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    const pilots = await svc.getPilotList();
    assert.strictEqual(pilots[0].name, 'Bob');
    assert.strictEqual(pilots[0].phone, null);
    assert.strictEqual(pilots[0].last_login, null);
    assert.strictEqual(pilots[0].outreach_status, null);
    assert.strictEqual(pilots[0].onboarding_step, 0);
  });

  await check('getPilotList propagates DB error', async () => {
    const pool = makePool([], { throws: 'DB connection refused' });
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    await assert.rejects(() => svc.getPilotList(), /DB connection refused/);
  });

  // ── generatePaymentLink ───────────────────────────────────────────────────

  await check('generatePaymentLink throws when Stripe not configured', async () => {
    const pool = makePool([]);
    const svc = new AdminPilotsService({ pool, stripe: null });
    await assert.rejects(
      () => svc.generatePaymentLink('agent-1', 'test@example.com'),
      /Stripe not configured/
    );
  });

  await check('generatePaymentLink throws when price ID missing', async () => {
    const pool = makePool([]);
    // No proPriceId injected and no env var — should throw
    const svc = new AdminPilotsService({ pool, stripe: makeStripe(), proPriceId: null });
    // Temporarily ensure env var is not set
    const origEnv = process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY;
    delete process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY;
    try {
      await assert.rejects(
        () => svc.generatePaymentLink('agent-1', 'test@example.com'),
        /Pro plan price ID not configured/
      );
    } finally {
      if (origEnv !== undefined) process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = origEnv;
    }
  });

  await check('generatePaymentLink passes correct metadata to Stripe', async () => {
    const pool = makePool([]);
    let capturedParams = null;
    const stripeInst = {
      checkout: {
        sessions: {
          create: async (params) => {
            capturedParams = params;
            return { id: 'cs_meta_test', url: 'https://checkout.stripe.com/cs_meta_test' };
          },
        },
      },
    };
    // Inject proPriceId directly so the test is isolated from env/config
    const svc = new AdminPilotsService({ pool, stripe: stripeInst, proPriceId: 'price_pro_monthly' });
    const result = await svc.generatePaymentLink('agent-abc', 'agent@example.com');
    assert.strictEqual(result.url, 'https://checkout.stripe.com/cs_meta_test');
    assert.ok(capturedParams, 'Stripe checkout.sessions.create should have been called');
    assert.strictEqual(capturedParams.mode, 'subscription');
    assert.strictEqual(capturedParams.customer_email, 'agent@example.com');
    assert.strictEqual(capturedParams.metadata.agent_id, 'agent-abc');
    assert.strictEqual(capturedParams.metadata.source, 'admin_payment_link');
    assert.strictEqual(capturedParams.line_items[0].price, 'price_pro_monthly');
    assert.strictEqual(capturedParams.line_items[0].quantity, 1);
  });

  // ── logContact ────────────────────────────────────────────────────────────

  await check('logContact throws when agent_id missing', async () => {
    const pool = makePool([]);
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    await assert.rejects(() => svc.logContact({ channel: 'email' }), /agent_id is required/);
  });

  await check('logContact throws when channel missing', async () => {
    const pool = makePool([]);
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    await assert.rejects(() => svc.logContact({ agent_id: 'agent-1' }), /channel is required/);
  });

  await check('logContact throws for invalid channel', async () => {
    const pool = makePool([]);
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    await assert.rejects(
      () => svc.logContact({ agent_id: 'agent-1', channel: 'telepathy' }),
      /channel must be one of/
    );
  });

  await check('logContact inserts row and returns it', async () => {
    const insertedRow = {
      id: 'outreach-uuid-1',
      agent_id: 'agent-1',
      contacted_at: new Date(),
      channel: 'email',
      notes: 'Followed up on pilot offer',
      status: 'contacted',
      created_at: new Date(),
    };
    const pool = makePool([[insertedRow]]);
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    const result = await svc.logContact({
      agent_id: 'agent-1',
      channel: 'email',
      notes: 'Followed up on pilot offer',
    });
    assert.strictEqual(result.id, 'outreach-uuid-1');
    assert.strictEqual(result.channel, 'email');
    assert.strictEqual(result.status, 'contacted');
    assert.strictEqual(pool.queries.length, 1);
  });

  await check('logContact defaults status to contacted', async () => {
    const pool = makePool([[{ id: 'row-1', status: 'contacted' }]]);
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    await svc.logContact({ agent_id: 'agent-1', channel: 'phone' });
    // Fifth param of INSERT query should be 'contacted'
    assert.strictEqual(pool.queries[0].params[4], 'contacted');
  });

  await check('logContact accepts custom status', async () => {
    const pool = makePool([[{ id: 'row-2', status: 'interested' }]]);
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    await svc.logContact({ agent_id: 'agent-1', channel: 'phone', status: 'interested' });
    assert.strictEqual(pool.queries[0].params[4], 'interested');
  });

  await check('logContact rejects invalid status', async () => {
    const pool = makePool([]);
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    await assert.rejects(
      () => svc.logContact({ agent_id: 'agent-1', channel: 'email', status: 'maybe' }),
      /status must be one of/
    );
  });

  // ── updateOutreachStatus ─────────────────────────────────────────────────

  await check('updateOutreachStatus throws when outreachId missing', async () => {
    const pool = makePool([]);
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    await assert.rejects(() => svc.updateOutreachStatus(null, 'interested'), /outreachId is required/);
  });

  await check('updateOutreachStatus throws when status missing', async () => {
    const pool = makePool([]);
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    await assert.rejects(() => svc.updateOutreachStatus('some-id', null), /status is required/);
  });

  await check('updateOutreachStatus throws for invalid status', async () => {
    const pool = makePool([[{ id: 'row-1', agent_id: 'agent-1' }]]);
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    await assert.rejects(
      () => svc.updateOutreachStatus('row-1', 'badstatus'),
      /status must be one of/
    );
  });

  await check('updateOutreachStatus returns 404 when row not found', async () => {
    const pool = makePool([[]]); // FETCH returns empty
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    await assert.rejects(
      () => svc.updateOutreachStatus('nonexistent-id', 'interested'),
      /Outreach log entry not found/
    );
  });

  await check('updateOutreachStatus updates and returns row', async () => {
    const updatedRow = { id: 'row-1', agent_id: 'agent-1', status: 'interested' };
    // First query = FETCH check (rows=[{id, agent_id}]), second = UPDATE (rows=[updatedRow])
    const pool = makePool([
      [{ id: 'row-1', agent_id: 'agent-1' }],
      [updatedRow],
    ]);
    const svc = new AdminPilotsService({ pool, stripe: makeStripe() });
    const result = await svc.updateOutreachStatus('row-1', 'interested');
    assert.strictEqual(result.status, 'interested');
    assert.strictEqual(pool.queries.length, 2);
  });

  // ── Route auth guard ──────────────────────────────────────────────────────

  await check('routes require API key — test requireApiKey middleware rejects missing key', async () => {
    const requireApiKey = require('../../lib/middleware/require-api-key');
    let statusCode = null;
    let responseBody = null;
    const req = { headers: {} };
    const res = {
      status(code) { statusCode = code; return this; },
      json(body) { responseBody = body; return this; },
    };
    requireApiKey(req, res, () => { throw new Error('next() should not be called'); });
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(responseBody.error, 'Unauthorized');
  });

  await check('requireApiKey allows correct key', async () => {
    const requireApiKey = require('../../lib/middleware/require-api-key');
    const origKey = process.env.LEADFLOW_API_KEY;
    process.env.LEADFLOW_API_KEY = 'test-key-12345';
    try {
      let nextCalled = false;
      const req = { headers: { 'x-api-key': 'test-key-12345' } };
      const res = {};
      requireApiKey(req, res, () => { nextCalled = true; });
      assert.strictEqual(nextCalled, true);
    } finally {
      if (origKey !== undefined) {
        process.env.LEADFLOW_API_KEY = origKey;
      } else {
        delete process.env.LEADFLOW_API_KEY;
      }
    }
  });

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
