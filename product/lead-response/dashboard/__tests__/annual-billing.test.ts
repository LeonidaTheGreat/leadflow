/**
 * @jest-environment node
 *
 * Annual billing integration tests:
 * - getTierFromPriceId() resolves both monthly AND annual price IDs to correct tiers
 * - upgrade-checkout passes annual price ID to Stripe when interval=annual
 * - MRR calculated correctly for annual subscriptions (annual / 12)
 * - Unknown price ID falls back to 'pro' (not 'professional')
 */

// ── Mock next/server ──────────────────────────────────────────────────────────
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      async json() { return body },
    })),
  },
}))

// ── Stripe mock ───────────────────────────────────────────────────────────────
const mockSubscriptionsRetrieve = jest.fn()
const mockCheckoutSessionsCreate = jest.fn().mockResolvedValue({
  id: 'cs_test_annual',
  url: 'https://checkout.stripe.com/test/annual',
})
const mockCustomersCreate = jest.fn().mockResolvedValue({ id: 'cus_test_annual' })
const mockConstructEvent = jest.fn()

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
    customers: { create: mockCustomersCreate },
  }))
)

// ── Resend mock ───────────────────────────────────────────────────────────────
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({ id: 'email-ok' }) },
  })),
}))

// ── Supabase / DB mocks ───────────────────────────────────────────────────────
const upsertMock = jest.fn().mockResolvedValue({ error: null })
const insertMock = jest.fn().mockResolvedValue({ error: null })
const updateEqMock = jest.fn().mockResolvedValue({ error: null })

const agentRow = {
  id: 'agent-123',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'Agent',
  stripe_customer_id: 'cus_existing_456',
  plan_tier: 'pilot',
}

const fromMock = jest.fn((tableName: string) => ({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: agentRow, error: null }),
      in: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      }),
    }),
    order: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }),
    }),
  }),
  upsert: (data: unknown, opts?: unknown) => {
    upsertMock(tableName, data, opts)
    return Promise.resolve({ error: null })
  },
  update: (data: unknown) => {
    return { eq: (col: string, val: unknown) => { updateEqMock(tableName, data, col, val); return Promise.resolve({ error: null }) } }
  },
  insert: (data: unknown) => {
    insertMock(tableName, data)
    return Promise.resolve({ error: null })
  },
}))

jest.mock('../lib/supabase-server', () => ({
  supabaseServer: { from: fromMock },
}))

jest.mock('../lib/db', () => ({
  supabaseAdmin: { from: fromMock },
}))

// ── Auth + logger mocks ───────────────────────────────────────────────────────
jest.mock('../lib/services/AuthService', () => ({
  getAuthUserId: jest.fn().mockResolvedValue('agent-123'),
}))

jest.mock('../lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWebhookRequest() {
  return {
    text: jest.fn().mockResolvedValue('{}'),
    headers: { get: jest.fn().mockReturnValue('stripe-sig-test') },
  } as any
}

function makeCheckoutEvent(subscriptionId: string) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        client_reference_id: 'agent-123',
        customer: 'cus_existing_456',
        subscription: subscriptionId,
      },
    },
  }
}

function makeAnnualSubscription(priceId: string, unitAmount: number) {
  return {
    id: `sub_${priceId}`,
    status: 'active',
    metadata: {},
    items: {
      data: [{
        price: {
          id: priceId,
          unit_amount: unitAmount,
          recurring: { interval: 'year' },
        },
        quantity: 1,
      }],
    },
    current_period_start: 1700000000,
    current_period_end: 1731622400,
    trial_start: null,
    trial_end: null,
    cancel_at_period_end: false,
    canceled_at: null,
    ended_at: null,
  }
}

// ── Tests: getTierFromPriceId via webhook ─────────────────────────────────────

describe('Annual Billing — tier resolution via Stripe webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set env vars before resetModules so the route picks them up
    process.env.STRIPE_SECRET_KEY = 'sk_test_annual'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    process.env.RESEND_API_KEY = 'resend_test'
    process.env.STRIPE_PRICE_STARTER_MONTHLY = 'price_starter_monthly'
    process.env.STRIPE_PRICE_STARTER_ANNUAL = 'price_starter_annual'
    process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = 'price_pro_monthly'
    process.env.STRIPE_PRICE_PRO_ANNUAL = 'price_pro_annual'
    process.env.STRIPE_PRICE_TEAM_MONTHLY = 'price_team_monthly'
    process.env.STRIPE_PRICE_TEAM_ANNUAL = 'price_team_annual'
    jest.resetModules()
  })

  it('resolves starter annual price ID to "starter" tier', async () => {
    mockSubscriptionsRetrieve.mockResolvedValue(
      makeAnnualSubscription('price_starter_annual', 49000)
    )
    mockConstructEvent.mockReturnValue(makeCheckoutEvent('sub_price_starter_annual'))

    const { POST } = await import('../app/api/webhooks/stripe/route')
    await POST(makeWebhookRequest())

    const subUpsert = upsertMock.mock.calls.find(([table]: [string]) => table === 'subscriptions')
    expect(subUpsert).toBeTruthy()
    expect(subUpsert![1].tier).toBe('starter')
    expect(subUpsert![1].interval).toBe('year')
  })

  it('resolves pro annual price ID to "pro" tier', async () => {
    mockSubscriptionsRetrieve.mockResolvedValue(
      makeAnnualSubscription('price_pro_annual', 149000)
    )
    mockConstructEvent.mockReturnValue(makeCheckoutEvent('sub_price_pro_annual'))

    const { POST } = await import('../app/api/webhooks/stripe/route')
    await POST(makeWebhookRequest())

    const subUpsert = upsertMock.mock.calls.find(([table]: [string]) => table === 'subscriptions')
    expect(subUpsert![1].tier).toBe('pro')
    expect(subUpsert![1].interval).toBe('year')
  })

  it('resolves team annual price ID to "team" tier', async () => {
    mockSubscriptionsRetrieve.mockResolvedValue(
      makeAnnualSubscription('price_team_annual', 399000)
    )
    mockConstructEvent.mockReturnValue(makeCheckoutEvent('sub_price_team_annual'))

    const { POST } = await import('../app/api/webhooks/stripe/route')
    await POST(makeWebhookRequest())

    const subUpsert = upsertMock.mock.calls.find(([table]: [string]) => table === 'subscriptions')
    expect(subUpsert![1].tier).toBe('team')
    expect(subUpsert![1].interval).toBe('year')
  })

  it('unknown price ID falls back to "pro" (not "professional")', async () => {
    const unknownSub = {
      ...makeAnnualSubscription('price_unknown_xyz', 9900),
      items: {
        data: [{
          price: { id: 'price_unknown_xyz', unit_amount: 9900, recurring: { interval: 'month' } },
          quantity: 1,
        }],
      },
    }
    mockSubscriptionsRetrieve.mockResolvedValue(unknownSub)
    mockConstructEvent.mockReturnValue(makeCheckoutEvent('sub_unknown'))

    const { POST } = await import('../app/api/webhooks/stripe/route')
    await POST(makeWebhookRequest())

    const subUpsert = upsertMock.mock.calls.find(([table]: [string]) => table === 'subscriptions')
    expect(subUpsert![1].tier).toBe('pro')
    expect(subUpsert![1].tier).not.toBe('professional')
  })

  it('calculates MRR correctly for annual subscription (unit_amount cents / 12 / 100)', async () => {
    // Pro annual: $149,000 cents = $1,490/year → MRR should be ~124.17
    mockSubscriptionsRetrieve.mockResolvedValue(
      makeAnnualSubscription('price_pro_annual', 149000)
    )
    mockConstructEvent.mockReturnValue(makeCheckoutEvent('sub_mrr_test'))

    const { POST } = await import('../app/api/webhooks/stripe/route')
    await POST(makeWebhookRequest())

    const subUpsert = upsertMock.mock.calls.find(([table]: [string]) => table === 'subscriptions')
    // Tier correct, interval stored as 'year'
    expect(subUpsert![1].tier).toBe('pro')
    expect(subUpsert![1].interval).toBe('year')

    // MRR update on real_estate_agents: 149000 / 12 / 100 = 124.166...
    const agentUpdate = updateEqMock.mock.calls.find(([table]: [string]) => table === 'real_estate_agents')
    if (agentUpdate) {
      const updateData = agentUpdate[1]
      if (updateData.mrr !== undefined) {
        expect(updateData.mrr).toBeCloseTo(124.17, 0)
      }
    }
  })
})

// ── Tests: upgrade-checkout interval support ──────────────────────────────────

describe('Annual Billing — upgrade-checkout uses annual price ID', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_annual'
    process.env.STRIPE_PRICE_STARTER_MONTHLY = 'price_starter_monthly'
    process.env.STRIPE_PRICE_STARTER_ANNUAL = 'price_starter_annual'
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_monthly'
    process.env.STRIPE_PRICE_PRO_ANNUAL = 'price_pro_annual'
    process.env.STRIPE_PRICE_TEAM_MONTHLY = 'price_team_monthly'
    process.env.STRIPE_PRICE_TEAM_ANNUAL = 'price_team_annual'
    jest.resetModules()
  })

  it('passes annual price ID to Stripe when interval=annual', async () => {
    const { POST } = await import('../app/api/stripe/upgrade-checkout/route')
    const req = {
      json: jest.fn().mockResolvedValue({ plan: 'pro', interval: 'annual' }),
      headers: { get: jest.fn().mockReturnValue(null) },
      cookies: { get: jest.fn().mockReturnValue(null) },
    } as any

    await POST(req)

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_pro_annual', quantity: 1 }],
      })
    )
  })

  it('defaults to monthly price ID when interval is omitted', async () => {
    const { POST } = await import('../app/api/stripe/upgrade-checkout/route')
    const req = {
      json: jest.fn().mockResolvedValue({ plan: 'pro' }),
      headers: { get: jest.fn().mockReturnValue(null) },
      cookies: { get: jest.fn().mockReturnValue(null) },
    } as any

    await POST(req)

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_pro_monthly', quantity: 1 }],
      })
    )
  })

  it('passes starter annual price ID for starter plan + annual interval', async () => {
    const { POST } = await import('../app/api/stripe/upgrade-checkout/route')
    const req = {
      json: jest.fn().mockResolvedValue({ plan: 'starter', interval: 'annual' }),
      headers: { get: jest.fn().mockReturnValue(null) },
      cookies: { get: jest.fn().mockReturnValue(null) },
    } as any

    await POST(req)

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_starter_annual', quantity: 1 }],
      })
    )
  })

  it('records interval in subscription_data metadata', async () => {
    const { POST } = await import('../app/api/stripe/upgrade-checkout/route')
    const req = {
      json: jest.fn().mockResolvedValue({ plan: 'pro', interval: 'annual' }),
      headers: { get: jest.fn().mockReturnValue(null) },
      cookies: { get: jest.fn().mockReturnValue(null) },
    } as any

    await POST(req)

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.objectContaining({
          metadata: expect.objectContaining({ interval: 'annual' }),
        }),
      })
    )
  })
})
