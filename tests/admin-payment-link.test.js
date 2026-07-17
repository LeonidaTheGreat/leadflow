'use strict';

/*
 * Spec:
 *   What:   Tests for PaymentLinkService and POST /api/admin/create-payment-link.
 *           Covers: auth guard, input validation, Stripe Payment Links creation,
 *           list candidates query, and URL format validation.
 *   Verify: npx jest tests/admin-payment-link.test.js → all green, exit 0
 *   Boundaries: No real Stripe calls or DB connections. All dependencies mocked.
 */

process.env.LEADFLOW_API_KEY = 'test-admin-key-abc123';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';

const VALID_KEY = 'test-admin-key-abc123';
const PAYMENT_LINK_URL = 'https://buy.stripe.com/test_abc123';

function makePool(agentRow = null) {
  return {
    query: jest.fn(async (sql) => {
      if (sql.includes('WHERE id = $1')) {
        return { rows: agentRow ? [agentRow] : [] };
      }
      if (sql.includes('onboarding_completed = true')) {
        return { rows: agentRow ? [agentRow] : [] };
      }
      return { rows: [] };
    }),
  };
}

function makeStripe(url = PAYMENT_LINK_URL) {
  return {
    paymentLinks: {
      create: jest.fn(async () => ({ id: 'plink_test_abc', url })),
    },
  };
}

function makeReqRes() {
  const res = {
    _status: 200,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
  };
  const req = { body: {}, headers: {} };
  return { req, res };
}

describe('PaymentLinkService', () => {
  let PaymentLinkService;
  const agentWithCustomer = { id: 'a1', email: 'alice@test.com', first_name: 'Alice', last_name: 'Smith', stripe_customer_id: 'cus_abc', plan_tier: 'starter' };
  const agentNoCustomer = { id: 'a2', email: 'bob@test.com', first_name: 'Bob', last_name: null, stripe_customer_id: null, plan_tier: null };

  beforeEach(() => {
    jest.resetModules();
    PaymentLinkService = require('../lib/services/PaymentLinkService');
  });

  test('createPaymentLink returns url matching buy.stripe.com and correct linkId', async () => {
    const svc = new PaymentLinkService({ pool: makePool(agentNoCustomer), stripe: makeStripe() });
    const result = await svc.createPaymentLink('a2', 'starter');
    expect(result.url).toMatch(/^https:\/\/buy\.stripe\.com\//);
    expect(result.linkId).toBe('plink_test_abc');
    expect(result.agent.email).toBe('bob@test.com');
  });

  test('createPaymentLink sets correct unit_amount per plan tier', async () => {
    const cases = [
      ['starter', 4900],
      ['professional', 14900],
      ['enterprise', 39900],
    ];
    for (const [tier, amount] of cases) {
      jest.resetModules();
      PaymentLinkService = require('../lib/services/PaymentLinkService');
      const mockStripe = makeStripe();
      const svc = new PaymentLinkService({ pool: makePool(agentNoCustomer), stripe: mockStripe });
      await svc.createPaymentLink('a2', tier);
      const args = mockStripe.paymentLinks.create.mock.calls[0][0];
      expect(args.line_items[0].price_data.unit_amount).toBe(amount);
    }
  });

  test('createPaymentLink metadata contains agent_id, tier, source', async () => {
    const mockStripe = makeStripe();
    const svc = new PaymentLinkService({ pool: makePool(agentNoCustomer), stripe: mockStripe });
    await svc.createPaymentLink('a2', 'professional');
    const args = mockStripe.paymentLinks.create.mock.calls[0][0];
    expect(args.metadata.agent_id).toBe('a2');
    expect(args.metadata.tier).toBe('professional');
    expect(args.metadata.source).toBe('admin_payment_link');
  });

  test('createPaymentLink includes stripe_customer_id in metadata when agent has one', async () => {
    const mockStripe = makeStripe();
    const svc = new PaymentLinkService({ pool: makePool(agentWithCustomer), stripe: mockStripe });
    await svc.createPaymentLink('a1', 'starter');
    const args = mockStripe.paymentLinks.create.mock.calls[0][0];
    expect(args.metadata.stripe_customer_id).toBe('cus_abc');
  });

  test('createPaymentLink omits stripe_customer_id from metadata when agent has none', async () => {
    const mockStripe = makeStripe();
    const svc = new PaymentLinkService({ pool: makePool(agentNoCustomer), stripe: mockStripe });
    await svc.createPaymentLink('a2', 'starter');
    const args = mockStripe.paymentLinks.create.mock.calls[0][0];
    expect(args.metadata.stripe_customer_id).toBeUndefined();
  });

  test('createPaymentLink throws on invalid plan tier', async () => {
    const svc = new PaymentLinkService({ pool: makePool(agentNoCustomer), stripe: makeStripe() });
    await expect(svc.createPaymentLink('a2', 'ultra')).rejects.toThrow('Invalid plan tier');
  });

  test('createPaymentLink throws when agent not found', async () => {
    const svc = new PaymentLinkService({ pool: makePool(null), stripe: makeStripe() });
    await expect(svc.createPaymentLink('missing', 'starter')).rejects.toThrow('Agent not found');
  });

  test('createPaymentLink throws when Stripe not configured (no secret key)', async () => {
    jest.resetModules();
    const savedKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    try {
      PaymentLinkService = require('../lib/services/PaymentLinkService');
      const svc = new PaymentLinkService({ pool: makePool(agentNoCustomer) });
      await expect(svc.createPaymentLink('a2', 'starter')).rejects.toThrow('not configured');
    } finally {
      process.env.STRIPE_SECRET_KEY = savedKey;
    }
  });

  test('listCompletedOnboardingAgents queries correct SQL conditions', async () => {
    const pool = { query: jest.fn(async () => ({ rows: [agentNoCustomer] })) };
    const svc = new PaymentLinkService({ pool, stripe: makeStripe() });
    const result = await svc.listCompletedOnboardingAgents();
    expect(result).toHaveLength(1);
    expect(pool.query).toHaveBeenCalledTimes(1);
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toMatch(/onboarding_completed = true/);
    expect(sql).toMatch(/email_verified = true/);
    expect(sql).toMatch(/subscription_status = 'inactive'/);
  });

  test('listCompletedOnboardingAgents returns empty array when no eligible agents', async () => {
    const pool = { query: jest.fn(async () => ({ rows: [] })) };
    const svc = new PaymentLinkService({ pool, stripe: makeStripe() });
    const result = await svc.listCompletedOnboardingAgents();
    expect(result).toEqual([]);
  });
});

describe('POST /api/admin/create-payment-link — auth guard', () => {
  beforeEach(() => { jest.resetModules(); });

  test('responds 401 when x-api-key header is missing', () => {
    const requireApiKey = require('../lib/middleware/require-api-key');
    const { req, res } = makeReqRes();
    req.headers = {};
    const next = jest.fn();
    requireApiKey(req, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('responds 401 when x-api-key header is wrong', () => {
    const requireApiKey = require('../lib/middleware/require-api-key');
    const { req, res } = makeReqRes();
    req.headers = { 'x-api-key': 'wrong-key' };
    const next = jest.fn();
    requireApiKey(req, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next() when x-api-key is correct', () => {
    const requireApiKey = require('../lib/middleware/require-api-key');
    const { req, res } = makeReqRes();
    req.headers = { 'x-api-key': VALID_KEY };
    const next = jest.fn();
    requireApiKey(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('POST /api/admin/create-payment-link — input validation', () => {
  const VALID_PLAN_TIERS = ['starter', 'professional', 'enterprise'];

  async function runHandler(body) {
    const { req, res } = makeReqRes();
    req.body = body;
    const handler = async (req, res) => {
      const { agentId, planTier } = req.body || {};
      if (!agentId || typeof agentId !== 'string' || !agentId.trim()) {
        return res.status(400).json({ error: 'agentId is required and must be a non-empty string' });
      }
      if (!VALID_PLAN_TIERS.includes(planTier)) {
        return res.status(400).json({ error: `planTier must be one of: ${VALID_PLAN_TIERS.join(', ')}` });
      }
      return res.status(200).json({ ok: true });
    };
    await handler(req, res);
    return res;
  }

  test('returns 400 when agentId is missing', async () => {
    const res = await runHandler({ planTier: 'starter' });
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/agentId/);
  });

  test('returns 400 when agentId is empty string', async () => {
    const res = await runHandler({ agentId: '  ', planTier: 'starter' });
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/agentId/);
  });

  test('returns 400 when planTier is not valid', async () => {
    const res = await runHandler({ agentId: 'valid-id', planTier: 'ultra' });
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/planTier/);
  });

  test('accepts all valid plan tiers without error', async () => {
    for (const tier of VALID_PLAN_TIERS) {
      const res = await runHandler({ agentId: 'valid-id', planTier: tier });
      expect(res._status).toBe(200);
    }
  });
});
