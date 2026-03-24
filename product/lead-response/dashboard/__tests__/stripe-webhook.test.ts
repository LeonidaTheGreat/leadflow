/**
 * Tests for the Stripe webhook route
 * Verifies that webhook events update real_estate_agents (not the orchestration agents table)
 * 
 * Bug fix: app/api/webhooks/stripe/route.ts previously used supabase.from('agents')
 * which targeted the orchestration agents table instead of real_estate_agents.
 * This test ensures the correct table is always used.
 */

// Mock Next.js server modules
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status || 200,
    })),
  },
}))

// Track which table names were used with .update()
const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
const insertMock = jest.fn().mockResolvedValue({ error: null })

const fromMock = jest.fn((tableName: string) => ({
  update: (data: unknown) => {
    updateMock(tableName, data)
    return { eq: jest.fn().mockResolvedValue({ error: null }) }
  },
  insert: (data: unknown) => {
    insertMock(tableName, data)
    return Promise.resolve({ error: null })
  },
}))

jest.mock('../lib/supabase-server', () => ({
  supabaseServer: { from: fromMock },
}))

// Mock Stripe
const mockSubscription = {
  id: 'sub_123',
  metadata: { agent_id: 'agent-uuid-123', tier: 'professional' },
  items: {
    data: [{
      price: {
        unit_amount: 9700,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
  },
  trial_end: null,
  cancellation_details: null,
}

const mockInvoice = {
  id: 'inv_123',
  subscription: 'sub_123',
  amount_paid: 9700,
  currency: 'usd',
  period_start: 1700000000,
  period_end: 1702592000,
  attempt_count: 1,
}

const mockConstructEvent = jest.fn()
const mockSubscriptionsRetrieve = jest.fn().mockResolvedValue(mockSubscription)

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
    subscriptions: {
      retrieve: mockSubscriptionsRetrieve,
    },
  }))
})

describe('Stripe Webhook Route — correct table usage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })

  it('should use real_estate_agents table, not agents table', async () => {
    // Read the source file and verify no references to from('agents') exist
    const fs = require('fs')
    const path = require('path')
    const routePath = path.resolve(__dirname, '../app/api/webhooks/stripe/route.ts')
    const source = fs.readFileSync(routePath, 'utf-8')

    // Must NOT reference the orchestration agents table
    expect(source).not.toMatch(/from\(['"]agents['"]\)/)

    // Must reference real_estate_agents for all updates
    const realEstateAgentsCount = (source.match(/from\(['"]real_estate_agents['"]\)/g) || []).length
    expect(realEstateAgentsCount).toBeGreaterThanOrEqual(4)
  })

  it('checkout.session.completed updates real_estate_agents', async () => {
    const mockSession = {
      client_reference_id: 'agent-uuid-123',
      customer: 'cus_123',
      subscription: 'sub_123',
    }

    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: mockSession },
    })

    // Import after mocks are set up
    const { POST } = await import('../app/api/webhooks/stripe/route')
    const mockRequest = {
      text: jest.fn().mockResolvedValue('{}'),
      headers: { get: jest.fn().mockReturnValue('stripe-sig') },
    } as any

    await POST(mockRequest)

    // Verify the table used for updates was real_estate_agents, not agents
    const updateCalls = updateMock.mock.calls
    for (const [tableName] of updateCalls) {
      expect(tableName).toBe('real_estate_agents')
      expect(tableName).not.toBe('agents')
    }
  })

  it('customer.subscription.deleted updates real_estate_agents', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: mockSubscription },
    })

    const { POST } = await import('../app/api/webhooks/stripe/route')
    const mockRequest = {
      text: jest.fn().mockResolvedValue('{}'),
      headers: { get: jest.fn().mockReturnValue('stripe-sig') },
    } as any

    await POST(mockRequest)

    const updateCalls = updateMock.mock.calls
    for (const [tableName] of updateCalls) {
      expect(tableName).toBe('real_estate_agents')
      expect(tableName).not.toBe('agents')
    }
  })

  it('invoice.paid updates real_estate_agents', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'invoice.paid',
      data: { object: mockInvoice },
    })

    const { POST } = await import('../app/api/webhooks/stripe/route')
    const mockRequest = {
      text: jest.fn().mockResolvedValue('{}'),
      headers: { get: jest.fn().mockReturnValue('stripe-sig') },
    } as any

    await POST(mockRequest)

    const updateCalls = updateMock.mock.calls
    for (const [tableName] of updateCalls) {
      expect(tableName).toBe('real_estate_agents')
      expect(tableName).not.toBe('agents')
    }
  })

  it('invoice.payment_failed updates real_estate_agents', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: { object: mockInvoice },
    })

    const { POST } = await import('../app/api/webhooks/stripe/route')
    const mockRequest = {
      text: jest.fn().mockResolvedValue('{}'),
      headers: { get: jest.fn().mockReturnValue('stripe-sig') },
    } as any

    await POST(mockRequest)

    const updateCalls = updateMock.mock.calls
    for (const [tableName] of updateCalls) {
      expect(tableName).toBe('real_estate_agents')
      expect(tableName).not.toBe('agents')
    }
  })
})
