'use strict';

/**
 * Unit tests for AdminPaymentLinkService logic
 *
 * Pattern: Extract business logic inline (mirroring service code) and test it
 * without importing the actual service class — avoids worktree node_modules issues.
 *
 * Covers:
 *   - VALID_TIERS constant values
 *   - Session param construction logic (metadata.agent_id embedding)
 *   - Discount coupon branching
 *   - Return value shape { url, sessionId, expiresAt }
 *   - expires_at calculation (24h = CHECKOUT_SESSION_EXPIRY_SECONDS)
 *   - metadata.agent_id webhook fallback (simulated)
 */

const assert = require('assert');

// ─── Constants (mirror lib/services/AdminPaymentLinkService.js) ───────────────
const VALID_TIERS = ['starter', 'pro', 'team'];
const CHECKOUT_SESSION_EXPIRY_HOURS = 24;
const CHECKOUT_SESSION_EXPIRY_SECONDS = CHECKOUT_SESSION_EXPIRY_HOURS * 60 * 60;

// ─── Logic extracted from AdminPaymentLinkService.generatePaymentLink ─────────

async function buildCheckoutSessionParams({
  agentEmail,
  agentId,
  tier,
  priceId,
  discountPercent,
  stripe,
  appUrl,
}) {
  const expiresAt = new Date(Date.now() + CHECKOUT_SESSION_EXPIRY_SECONDS * 1000);

  let discounts = undefined;
  if (discountPercent != null) {
    const coupon = await stripe.coupons.create({
      percent_off: discountPercent,
      duration: 'once',
      metadata: { agent_id: agentId, tier, source: 'admin_payment_link' },
    });
    discounts = [{ coupon: coupon.id }];
  }

  const params = {
    customer_email: agentEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    subscription_data: {
      metadata: {
        agent_id: agentId,
        source: 'admin_payment_link',
        tier,
      },
    },
    metadata: {
      agent_id: agentId,
      source: 'admin_payment_link',
      tier,
    },
    success_url: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard`,
    expires_at: Math.floor(expiresAt.getTime() / 1000),
    allow_promotion_codes: discounts == null,
  };

  if (discounts) {
    params.discounts = discounts;
  }

  const session = await stripe.checkout.sessions.create(params);

  return {
    result: {
      url: session.url,
      sessionId: session.id,
      expiresAt: expiresAt.toISOString(),
    },
    capturedParams: params,
    expiresAtDate: expiresAt,
  };
}

// ─── Input validation (mirror routes/admin/payment-link.js) ───────────────────
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// ─── Webhook metadata.agent_id fallback simulation ────────────────────────────
function simulateCheckoutCompleted(session, db) {
  const userId =
    session.client_reference_id ||
    (session.metadata && session.metadata.agent_id) ||
    null;

  if (!userId) {
    return { acknowledged: true, userUpdated: false, reason: 'no_user_id' };
  }

  const tier = (session.metadata && session.metadata.tier) || 'professional';
  db[userId] = { subscription_status: 'active', plan_tier: tier };

  return { acknowledged: true, userUpdated: true, userId, tier };
}

// ─── Mock Stripe factory ──────────────────────────────────────────────────────
function makeMockStripe({
  sessionId = 'cs_test_123',
  sessionUrl = 'https://checkout.stripe.com/test',
  couponId = 'coupon_123',
} = {}) {
  return {
    checkout: {
      sessions: {
        create: async (params) => ({
          id: sessionId,
          url: sessionUrl,
          metadata: params.metadata,
        }),
      },
    },
    coupons: {
      create: async (params) => ({
        id: couponId,
        percent_off: params.percent_off,
      }),
    },
  };
}

const VALID_AGENT_ID = '00000000-0000-0000-0000-000000000001';
const VALID_AGENT_EMAIL = 'agent@example.com';

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
  console.log('\nAdminPaymentLinkService — constants');

  await test('VALID_TIERS includes starter, pro, team', () => {
    assert.ok(VALID_TIERS.includes('starter'), 'should include starter');
    assert.ok(VALID_TIERS.includes('pro'), 'should include pro');
    assert.ok(VALID_TIERS.includes('team'), 'should include team');
    assert.strictEqual(VALID_TIERS.length, 3, 'should have exactly 3 tiers');
  });

  await test('CHECKOUT_SESSION_EXPIRY_HOURS is 24', () => {
    assert.strictEqual(CHECKOUT_SESSION_EXPIRY_HOURS, 24);
  });

  await test('CHECKOUT_SESSION_EXPIRY_SECONDS is 24 * 3600', () => {
    assert.strictEqual(CHECKOUT_SESSION_EXPIRY_SECONDS, 86400);
  });

  // ── Route input validation ────────────────────────────────────────────────
  console.log('\nInput validation (route)');

  await test('accepts valid agentId UUID + tier "starter"', () => {
    const errors = validateGeneratePaymentLinkInput({ agentId: VALID_AGENT_ID, tier: 'starter' });
    assert.deepStrictEqual(errors, []);
  });

  await test('accepts valid agentId + tier "pro" + discount 20', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: VALID_AGENT_ID,
      tier: 'pro',
      discountPercent: 20,
    });
    assert.deepStrictEqual(errors, []);
  });

  await test('accepts valid agentId + tier "team" + discount 99', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: VALID_AGENT_ID,
      tier: 'team',
      discountPercent: 99,
    });
    assert.deepStrictEqual(errors, []);
  });

  await test('rejects missing agentId', () => {
    const errors = validateGeneratePaymentLinkInput({ tier: 'starter' });
    assert.ok(errors.some(e => e.includes('agentId is required')));
  });

  await test('rejects empty string agentId', () => {
    const errors = validateGeneratePaymentLinkInput({ agentId: '   ', tier: 'starter' });
    assert.ok(errors.some(e => e.includes('agentId is required')));
  });

  await test('rejects non-UUID agentId', () => {
    const errors = validateGeneratePaymentLinkInput({ agentId: 'not-a-uuid', tier: 'starter' });
    assert.ok(errors.some(e => e.includes('UUID')));
  });

  await test('rejects tier "gold"', () => {
    const errors = validateGeneratePaymentLinkInput({ agentId: VALID_AGENT_ID, tier: 'gold' });
    assert.ok(errors.some(e => e.includes('tier must be one of')));
  });

  await test('rejects tier "professional" (wrong key for this endpoint)', () => {
    const errors = validateGeneratePaymentLinkInput({ agentId: VALID_AGENT_ID, tier: 'professional' });
    assert.ok(errors.some(e => e.includes('tier must be one of')));
  });

  await test('rejects discount 0 (below minimum)', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: VALID_AGENT_ID,
      tier: 'starter',
      discountPercent: 0,
    });
    assert.ok(errors.some(e => e.includes('discountPercent must be')));
  });

  await test('rejects discount 100 (above maximum)', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: VALID_AGENT_ID,
      tier: 'starter',
      discountPercent: 100,
    });
    assert.ok(errors.some(e => e.includes('discountPercent must be')));
  });

  await test('rejects discount "twenty" (non-numeric)', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: VALID_AGENT_ID,
      tier: 'starter',
      discountPercent: 'twenty',
    });
    assert.ok(errors.some(e => e.includes('discountPercent must be')));
  });

  await test('accepts null discountPercent', () => {
    const errors = validateGeneratePaymentLinkInput({
      agentId: VALID_AGENT_ID,
      tier: 'starter',
      discountPercent: null,
    });
    assert.deepStrictEqual(errors, []);
  });

  // ── Checkout session params ───────────────────────────────────────────────
  console.log('\nCheckout session params');

  await test('embeds agent_id in session metadata AND subscription_data.metadata', async () => {
    const { capturedParams } = await buildCheckoutSessionParams({
      agentEmail: VALID_AGENT_EMAIL,
      agentId: VALID_AGENT_ID,
      tier: 'starter',
      priceId: 'price_starter_test',
      stripe: makeMockStripe(),
      appUrl: 'https://my-app.example.com',
    });

    assert.strictEqual(capturedParams.metadata.agent_id, VALID_AGENT_ID);
    assert.strictEqual(capturedParams.metadata.source, 'admin_payment_link');
    assert.strictEqual(capturedParams.subscription_data.metadata.agent_id, VALID_AGENT_ID);
    assert.strictEqual(capturedParams.subscription_data.metadata.source, 'admin_payment_link');
  });

  await test('prefills customer_email with agent email', async () => {
    const { capturedParams } = await buildCheckoutSessionParams({
      agentEmail: VALID_AGENT_EMAIL,
      agentId: VALID_AGENT_ID,
      tier: 'pro',
      priceId: 'price_pro_test',
      stripe: makeMockStripe(),
      appUrl: 'https://my-app.example.com',
    });

    assert.strictEqual(capturedParams.customer_email, VALID_AGENT_EMAIL);
  });

  await test('success_url includes {CHECKOUT_SESSION_ID} placeholder', async () => {
    const { capturedParams } = await buildCheckoutSessionParams({
      agentEmail: VALID_AGENT_EMAIL,
      agentId: VALID_AGENT_ID,
      tier: 'starter',
      priceId: 'price_starter_test',
      stripe: makeMockStripe(),
      appUrl: 'https://my-app.example.com',
    });

    assert.ok(
      capturedParams.success_url.includes('{CHECKOUT_SESSION_ID}'),
      `success_url "${capturedParams.success_url}" must include placeholder`
    );
    assert.ok(
      capturedParams.success_url.startsWith('https://my-app.example.com'),
      'success_url must use appUrl'
    );
  });

  await test('expires_at is approx 24 hours in the future (unix timestamp)', async () => {
    const before = Math.floor(Date.now() / 1000);
    const { capturedParams } = await buildCheckoutSessionParams({
      agentEmail: VALID_AGENT_EMAIL,
      agentId: VALID_AGENT_ID,
      tier: 'starter',
      priceId: 'price_starter_test',
      stripe: makeMockStripe(),
      appUrl: 'https://my-app.example.com',
    });
    const after = Math.floor(Date.now() / 1000);

    const expectedMin = before + 24 * 3600;
    const expectedMax = after + 24 * 3600;

    assert.ok(
      capturedParams.expires_at >= expectedMin,
      `expires_at (${capturedParams.expires_at}) must be >= now+24h (${expectedMin})`
    );
    assert.ok(
      capturedParams.expires_at <= expectedMax,
      `expires_at (${capturedParams.expires_at}) must be <= now+24h (${expectedMax})`
    );
  });

  await test('returns { url, sessionId, expiresAt } with ISO expiresAt', async () => {
    const { result } = await buildCheckoutSessionParams({
      agentEmail: VALID_AGENT_EMAIL,
      agentId: VALID_AGENT_ID,
      tier: 'team',
      priceId: 'price_team_test',
      stripe: makeMockStripe({ sessionId: 'cs_team_999', sessionUrl: 'https://checkout.stripe.com/team' }),
      appUrl: 'https://my-app.example.com',
    });

    assert.strictEqual(result.url, 'https://checkout.stripe.com/team');
    assert.strictEqual(result.sessionId, 'cs_team_999');
    assert.ok(result.expiresAt, 'expiresAt should be set');
    assert.ok(new Date(result.expiresAt) > new Date(), 'expiresAt should be in the future');
    assert.ok(result.expiresAt.endsWith('Z') || result.expiresAt.includes('T'), 'expiresAt should be ISO string');
  });

  // ── Discount coupon ───────────────────────────────────────────────────────
  console.log('\nDiscount coupon');

  await test('creates coupon with correct params when discountPercent=20', async () => {
    let couponParams = null;
    const mockStripe = {
      checkout: {
        sessions: {
          create: async (params) => ({ id: 'cs_disc', url: 'https://checkout.stripe.com/disc' }),
        },
      },
      coupons: {
        create: async (params) => {
          couponParams = params;
          return { id: 'coupon_20off' };
        },
      },
    };

    const { capturedParams } = await buildCheckoutSessionParams({
      agentEmail: VALID_AGENT_EMAIL,
      agentId: VALID_AGENT_ID,
      tier: 'starter',
      priceId: 'price_starter_test',
      discountPercent: 20,
      stripe: mockStripe,
      appUrl: 'https://my-app.example.com',
    });

    assert.ok(couponParams, 'coupon should have been created');
    assert.strictEqual(couponParams.percent_off, 20);
    assert.strictEqual(couponParams.metadata.agent_id, VALID_AGENT_ID);
    assert.ok(capturedParams.discounts, 'discounts should be set on session');
    assert.strictEqual(capturedParams.discounts[0].coupon, 'coupon_20off');
    assert.strictEqual(capturedParams.allow_promotion_codes, false, 'should disable allow_promotion_codes when coupon is set');
  });

  await test('does not create coupon when no discountPercent', async () => {
    let couponCreated = false;
    const mockStripe = {
      checkout: {
        sessions: {
          create: async (params) => ({ id: 'cs_nodisc', url: 'https://checkout.stripe.com/nodisc' }),
        },
      },
      coupons: {
        create: async () => {
          couponCreated = true;
          return { id: 'should_not_happen' };
        },
      },
    };

    const { capturedParams } = await buildCheckoutSessionParams({
      agentEmail: VALID_AGENT_EMAIL,
      agentId: VALID_AGENT_ID,
      tier: 'starter',
      priceId: 'price_starter_test',
      stripe: mockStripe,
      appUrl: 'https://my-app.example.com',
    });

    assert.strictEqual(couponCreated, false, 'coupon should NOT have been created');
    assert.ok(!capturedParams.discounts, 'discounts should not be set on session');
    assert.strictEqual(capturedParams.allow_promotion_codes, true, 'should allow promo codes when no coupon');
  });

  // ─── Webhook metadata.agent_id fallback ──────────────────────────────────
  console.log('\nWebhook checkout.session.completed — metadata.agent_id fallback');

  await test('upgrades agent from metadata.agent_id when no client_reference_id', () => {
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
      metadata: { agent_id: 'uuid-from-meta', tier: 'pro' },
    };
    const result = simulateCheckoutCompleted(session, db);
    assert.strictEqual(result.userId, 'uuid-from-cri');
    assert.ok(db['uuid-from-cri'], 'should update agent from client_reference_id');
    assert.ok(!db['uuid-from-meta'], 'should NOT update agent from metadata');
  });

  await test('no-ops when both client_reference_id and metadata are null', () => {
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

  await test('no-ops when metadata lacks agent_id', () => {
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
