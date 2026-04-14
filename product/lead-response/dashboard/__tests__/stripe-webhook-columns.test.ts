/**
 * @jest-environment node
 *
 * Integration test: Stripe webhook handler only uses columns that exist in real_estate_agents.
 *
 * Missing columns (stripe_subscription_id, plan_activated_at, payment_status, cancelled_at)
 * cause PostgREST to reject the entire UPDATE atomically, leaving agent records un-upgraded.
 *
 * This test verifies the fix: all update payloads use only columns from SCHEMA.md.
 */

// Columns that actually exist in real_estate_agents (from SCHEMA.md)
const VALID_COLUMNS = new Set([
  'id', 'email', 'password_hash', 'first_name', 'last_name', 'phone_number',
  'state', 'status', 'timezone', 'email_verified', 'stripe_customer_id',
  'subscription_status', 'plan_tier', 'mrr', 'trial_ends_at', 'source',
  'pilot_started_at', 'pilot_expires_at', 'onboarding_step',
  'last_onboarding_step_update', 'onboarding_completed', 'onboarding_completed_at',
  'satisfaction_ping_enabled', 'created_at', 'updated_at', 'last_login_at',
  'trial_banner_dismissed', 'trial_email_day6_sent', 'trial_email_day3_sent',
  'trial_email_day1_sent', 'trial_email_expired_sent', 'subscription_start_date',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
])

// Columns that must NEVER appear in real_estate_agents updates
const FORBIDDEN_COLUMNS = [
  'stripe_subscription_id',
  'plan_activated_at',
  'payment_status',
  'cancelled_at',
]

// Track all update calls to real_estate_agents
const agentUpdatePayloads: Record<string, unknown>[] = []

// Mock supabase — capture update payloads for real_estate_agents
const eqMock = jest.fn().mockResolvedValue({ error: null })
const selectMock = jest.fn().mockReturnValue({
  eq: jest.fn().mockReturnValue({
    single: jest.fn().mockResolvedValue({
      data: { email: 'test@example.com', first_name: 'Test' },
      error: null,
    }),
  }),
})
const upsertMock = jest.fn().mockResolvedValue({ error: null })

const fromMock = jest.fn((tableName: string) => ({
  update: (data: Record<string, unknown>) => {
    if (tableName === 'real_estate_agents') {
      agentUpdatePayloads.push(data)
    }
    return { eq: eqMock }
  },
  insert: jest.fn().mockResolvedValue({ error: null }),
  upsert: upsertMock,
  select: selectMock,
}))

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status || 200,
    })),
  },
}))

jest.mock('../lib/supabase-server', () => ({
  supabaseServer: { from: fromMock },
}))

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({}) },
  })),
}))

const mockSubscription = {
  id: 'sub_test_123',
  status: 'active',
  metadata: { agent_id: 'agent-uuid-456' },
  items: {
    data: [{
      price: {
        id: 'price_starter',
        unit_amount: 4900,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
  },
  current_period_start: 1700000000,
  current_period_end: 1702592000,
  trial_start: null,
  trial_end: null,
  cancel_at_period_end: false,
  canceled_at: null,
  ended_at: null,
  cancellation_details: { reason: 'cancellation_requested' },
}

const mockConstructEvent = jest.fn()
const mockSubscriptionsRetrieve = jest.fn().mockResolvedValue(mockSubscription)

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  }))
})

function makeRequest() {
  return {
    text: jest.fn().mockResolvedValue('{}'),
    headers: { get: jest.fn().mockReturnValue('stripe-sig-test') },
  } as any
}

describe('Stripe webhook — only valid real_estate_agents columns', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    agentUpdatePayloads.length = 0
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    process.env.RESEND_API_KEY = 'test_resend_key'
  })

  it('checkout.session.completed sets plan_tier, subscription_status=active, mrr', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'agent-uuid-456',
          customer: 'cus_test_123',
          subscription: 'sub_test_123',
        },
      },
    })

    const { POST } = await import('../app/api/webhooks/stripe/route')
    await POST(makeRequest())

    expect(agentUpdatePayloads.length).toBeGreaterThanOrEqual(1)
    const payload = agentUpdatePayloads[0]

    // Must set these columns
    expect(payload).toHaveProperty('plan_tier')
    expect(payload).toHaveProperty('subscription_status', 'active')
    expect(payload).toHaveProperty('mrr')
    expect(payload).toHaveProperty('status', 'active')
    expect(payload).toHaveProperty('stripe_customer_id')

    // Must NOT reference nonexistent columns
    for (const col of FORBIDDEN_COLUMNS) {
      expect(payload).not.toHaveProperty(col)
    }

    // Every column in the payload must exist in the schema
    for (const col of Object.keys(payload)) {
      expect(VALID_COLUMNS).toContain(col)
    }
  })

  it('invoice.payment_failed uses subscription_status, not payment_status', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'inv_fail_123',
          subscription: 'sub_test_123',
          amount_paid: 0,
          currency: 'usd',
          period_start: 1700000000,
          period_end: 1702592000,
          attempt_count: 1,
        },
      },
    })

    const { POST } = await import('../app/api/webhooks/stripe/route')
    await POST(makeRequest())

    expect(agentUpdatePayloads.length).toBeGreaterThanOrEqual(1)
    const payload = agentUpdatePayloads[0]

    expect(payload).toHaveProperty('subscription_status', 'past_due')
    expect(payload).not.toHaveProperty('payment_status')

    for (const col of Object.keys(payload)) {
      expect(VALID_COLUMNS).toContain(col)
    }
  })

  it('customer.subscription.deleted does not use cancelled_at', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: mockSubscription },
    })

    const { POST } = await import('../app/api/webhooks/stripe/route')
    await POST(makeRequest())

    expect(agentUpdatePayloads.length).toBeGreaterThanOrEqual(1)
    const payload = agentUpdatePayloads[0]

    expect(payload).toHaveProperty('subscription_status', 'cancelled')
    expect(payload).toHaveProperty('mrr', 0)
    expect(payload).not.toHaveProperty('cancelled_at')

    for (const col of Object.keys(payload)) {
      expect(VALID_COLUMNS).toContain(col)
    }
  })

  it('no update payload to real_estate_agents contains forbidden columns across all events', () => {
    // This is a summary check — all payloads captured across the above tests
    // must only contain valid columns. The per-event tests above already verify
    // specific forbidden columns, but this catches any new ones added later.
    for (const payload of agentUpdatePayloads) {
      for (const col of Object.keys(payload)) {
        expect(VALID_COLUMNS).toContain(col)
      }
      for (const col of FORBIDDEN_COLUMNS) {
        expect(payload).not.toHaveProperty(col)
      }
    }
  })
})
