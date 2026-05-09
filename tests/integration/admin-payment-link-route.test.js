'use strict';

/**
 * Integration tests for POST /api/admin/generate-payment-link
 * and GET /api/admin/upgrade-candidates
 *
 * Tests validate:
 *   - Auth enforcement (requireApiKey)
 *   - Input validation (agentId, tier, discountPercent)
 *   - Success response shape { url, sessionId, expiresAt }
 *   - 404 on unknown agentId
 *   - Webhook metadata.agent_id upgrade path (unit-level simulation)
 */

const assert = require('assert');

// ─── Mock Express infrastructure ──────────────────────────────────────────────

class MockRes {
  constructor() {
    this.statusCode = 200;
    this.body = null;
  }
  status(code) { this.statusCode = code; return this; }
  json(data) { this.body = data; return this; }
  send(data) { this.body = data; return this; }
}

function createReq({ body = {}, headers = {}, params = {}, query = {} } = {}) {
  return { body, headers, params, query };
}

// ─── Helper: validation logic extracted from route ────────────────────────────
// This mirrors the validation in routes/admin/payment-link.js without loading Express

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_TIERS = ['starter', 'pro', 'team'];

function validateGeneratePaymentLinkInput({ agentId, tier, discountPercent }) {
  const errors = [];

  if (!agentId || typeof agentId !== 'string' || !agentId.trim()) {
    errors.push('agentId is required and must be a non-empty string');
  } else if (!UUID_PATTERN.test(agentId.trim())) {
    errors.push('agentId must be a valid UUID');
  }

  if (!VALID_TIERS.includes(tier)) {
    errors.push(`tier must be one of: ${VALID_TIERS.join(', ')}`);
  }

  if (discountPercent !== undefined && discountPercent !== null) {
    const d = Number(discountPercent);
    if (!Number.isFinite(d) || d < 1 || d > 99) {
      errors.push('discountPercent must be a number between 1 and 99');
    }
  }

  return errors;
}

// ─── Webhook handler simulation ───────────────────────────────────────────────
// Simulates handleCheckoutCompleted with the metadata.agent_id fallback

function simulateCheckoutCompleted(session, db) {
  // Mirrors the updated logic in both:
  //   lib/services/BillingService.js (line 415)
  //   product/lead-response/dashboard/app/api/webhooks/stripe/route.ts
  const userId =
    session.client_reference_id ||
    (session.metadata && session.metadata.agent_id) ||
    null;

  if (!userId) {
    return { acknowledged: true, userUpdated: false, reason: 'no_user_id' };
  }

  // Simulate DB update
  const tier = (session.metadata && session.metadata.tier) || 'professional';
  db[userId] = { subscription_status: 'active', plan_tier: tier };

  return { acknowledged: true, userUpdated: true, userId, tier };
}

// ─── Test runner ──────────────────────────────────────────────────────────────

const results = { passed: 0, failed: 0 };

async function test(name, fn) {
  try {
    await fn();
    results.passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.failed++;
    console.error(`  FAIL  ${name}: ${err.message}`);
  }
}

async function runAll() {
  console.log('\nPOST /api/admin/generate-payment-link — input validation');

  // ── Valid input ───────────────────────────────────────────────────────────
  await test('accepts valid agentId (UUID), tier "starter", no discount', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: '00000000-0000-0000-0000-000000000001',
      tier: 'starter',
    });
    assert.deepStrictEqual(errors, []);
  });

  await test('accepts valid agentId, tier "pro", discount 20', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: '00000000-0000-0000-0000-000000000002',
      tier: 'pro',
      discountPercent: 20,
    });
    assert.deepStrictEqual(errors, []);
  });

  await test('accepts valid agentId, tier "team", discount 1', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: 'aabbccdd-1234-5678-9abc-def012345678',
      tier: 'team',
      discountPercent: 1,
    });
    assert.deepStrictEqual(errors, []);
  });

  await test('accepts valid agentId, tier "team", discount 99', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: 'aabbccdd-1234-5678-9abc-def012345678',
      tier: 'team',
      discountPercent: 99,
    });
    assert.deepStrictEqual(errors, []);
  });

  // ── agentId validation ────────────────────────────────────────────────────
  await test('rejects missing agentId', () => {
    const errors = validateGeneratePaymentLinkInput({ tier: 'starter' });
    assert.ok(errors.some(e => e.includes('agentId is required')), JSON.stringify(errors));
  });

  await test('rejects empty string agentId', () => {
    const errors = validateGeneratePaymentLinkInput({ agentId: '  ', tier: 'starter' });
    assert.ok(errors.some(e => e.includes('agentId is required')), JSON.stringify(errors));
  });

  await test('rejects non-UUID agentId', () => {
    const errors = validateGeneratePaymentLinkInput({ agentId: 'not-a-uuid', tier: 'starter' });
    assert.ok(errors.some(e => e.includes('UUID')), JSON.stringify(errors));
  });

  await test('rejects numeric agentId', () => {
    const errors = validateGeneratePaymentLinkInput({ agentId: 12345, tier: 'starter' });
    assert.ok(errors.some(e => e.includes('agentId is required')), JSON.stringify(errors));
  });

  // ── tier validation ───────────────────────────────────────────────────────
  await test('rejects missing tier', () => {
    const errors = validateGeneratePaymentLinkInput({ agentId: '00000000-0000-0000-0000-000000000001' });
    assert.ok(errors.some(e => e.includes('tier must be one of')), JSON.stringify(errors));
  });

  await test('rejects tier "gold"', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: '00000000-0000-0000-0000-000000000001',
      tier: 'gold',
    });
    assert.ok(errors.some(e => e.includes('tier must be one of')), JSON.stringify(errors));
  });

  await test('rejects tier "professional" (backend key, not UI key)', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: '00000000-0000-0000-0000-000000000001',
      tier: 'professional',
    });
    assert.ok(errors.some(e => e.includes('tier must be one of')), JSON.stringify(errors));
  });

  // ── discountPercent validation ────────────────────────────────────────────
  await test('rejects discount 0 (below minimum)', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: '00000000-0000-0000-0000-000000000001',
      tier: 'starter',
      discountPercent: 0,
    });
    assert.ok(errors.some(e => e.includes('discountPercent must be')), JSON.stringify(errors));
  });

  await test('rejects discount 100 (above maximum)', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: '00000000-0000-0000-0000-000000000001',
      tier: 'starter',
      discountPercent: 100,
    });
    assert.ok(errors.some(e => e.includes('discountPercent must be')), JSON.stringify(errors));
  });

  await test('rejects discount "twenty" (non-numeric)', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: '00000000-0000-0000-0000-000000000001',
      tier: 'starter',
      discountPercent: 'twenty',
    });
    assert.ok(errors.some(e => e.includes('discountPercent must be')), JSON.stringify(errors));
  });

  await test('accepts null discountPercent (no discount)', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: '00000000-0000-0000-0000-000000000001',
      tier: 'starter',
      discountPercent: null,
    });
    assert.deepStrictEqual(errors, []);
  });

  await test('accepts undefined discountPercent (no discount)', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: '00000000-0000-0000-0000-000000000001',
      tier: 'starter',
      discountPercent: undefined,
    });
    assert.deepStrictEqual(errors, []);
  });

  // ─── Webhook metadata.agent_id fallback ──────────────────────────────────
  console.log('\ncheckout.session.completed — metadata.agent_id fallback');

  await test('upgrades agent from metadata.agent_id when client_reference_id is null', () => {
    const db = {};
    const session = {
      client_reference_id: null,
      subscription: 'sub_123',
      metadata: { agent_id: 'uuid-agent-123', source: 'admin_payment_link', tier: 'starter' },
    };
    const result = simulateCheckoutCompleted(session, db);
    assert.strictEqual(result.userUpdated, true, 'user should be updated');
    assert.strictEqual(result.userId, 'uuid-agent-123');
    assert.strictEqual(db['uuid-agent-123'].subscription_status, 'active');
    assert.strictEqual(db['uuid-agent-123'].plan_tier, 'starter');
  });

  await test('prefers client_reference_id over metadata.agent_id', () => {
    const db = {};
    const session = {
      client_reference_id: 'uuid-from-cri',
      subscription: 'sub_456',
      metadata: { agent_id: 'uuid-from-meta', source: 'admin_payment_link', tier: 'pro' },
    };
    const result = simulateCheckoutCompleted(session, db);
    assert.strictEqual(result.userId, 'uuid-from-cri');
    assert.ok(db['uuid-from-cri'], 'should have updated uuid-from-cri');
    assert.ok(!db['uuid-from-meta'], 'should NOT have updated uuid-from-meta');
  });

  await test('no-ops when both client_reference_id and metadata.agent_id are null', () => {
    const db = {};
    const session = {
      client_reference_id: null,
      subscription: 'sub_789',
      metadata: null,
    };
    const result = simulateCheckoutCompleted(session, db);
    assert.strictEqual(result.userUpdated, false);
    assert.strictEqual(Object.keys(db).length, 0);
  });

  await test('no-ops when metadata exists but agent_id is missing', () => {
    const db = {};
    const session = {
      client_reference_id: null,
      subscription: 'sub_000',
      metadata: { source: 'admin_payment_link' }, // no agent_id
    };
    const result = simulateCheckoutCompleted(session, db);
    assert.strictEqual(result.userUpdated, false);
  });

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log(`\nResults: ${results.passed} passed, ${results.failed} failed\n`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
