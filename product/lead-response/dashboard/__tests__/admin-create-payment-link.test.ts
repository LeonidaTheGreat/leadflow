/**
 * @jest-environment node
 *
 * Tests for POST /api/admin/create-payment-link
 * Verifies auth, input validation, Stripe payment link creation, and agent lookup.
 */

// ─── Mock next/server ────────────────────────────────────────────────────────

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}))

// ─── Mock auth ────────────────────────────────────────────────────────────────

const mockRequireAdmin = jest.fn()
jest.mock('../lib/services/AuthService', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

// ─── Mock logger ─────────────────────────────────────────────────────────────

jest.mock('../lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}))

// ─── Mock Stripe ──────────────────────────────────────────────────────────────

const mockPricesList = jest.fn()
const mockPricesCreate = jest.fn()
const mockPaymentLinksCreate = jest.fn()

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    prices: {
      list: mockPricesList,
      create: mockPricesCreate,
    },
    paymentLinks: {
      create: mockPaymentLinksCreate,
    },
  }))
})

// ─── Mock DB ─────────────────────────────────────────────────────────────────

const mockSingle = jest.fn()
const mockEq = jest.fn()
const mockSelect = jest.fn()
const mockFrom = jest.fn()

jest.mock('../lib/db', () => ({
  postgrestAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: { get: (k: string) => headers[k] ?? null },
  } as any
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/admin/create-payment-link', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()

    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.leadflow.ai'

    // Default: admin auth passes
    mockRequireAdmin.mockResolvedValue(true)

    // Default DB chain: agent found
    mockSingle.mockResolvedValue({
      data: {
        id: 'agent-uuid-1',
        email: 'agent@test.com',
        stripe_customer_id: null,
        plan_tier: 'pro',
      },
      error: null,
    })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    // Default Stripe: no existing price, create returns ID
    mockPricesList.mockResolvedValue({ data: [] })
    mockPricesCreate.mockResolvedValue({ id: 'price_test_123' })
    mockPaymentLinksCreate.mockResolvedValue({
      id: 'plink_test_123',
      url: 'https://buy.stripe.com/test_abc123',
    })
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue(false)

    const { POST } = await import('../app/api/admin/create-payment-link/route')
    const res = await POST(makeRequest({ agentId: 'agent-1', planTier: 'pro' }))

    expect(res.status).toBe(401)
    expect((res as any).body.error).toBe('Unauthorized')
  })

  it('returns 400 when agentId is missing', async () => {
    const { POST } = await import('../app/api/admin/create-payment-link/route')
    const res = await POST(makeRequest({ planTier: 'pro' }))

    expect(res.status).toBe(400)
    expect((res as any).body.error).toMatch(/agentId/)
  })

  it('returns 400 when planTier is invalid', async () => {
    const { POST } = await import('../app/api/admin/create-payment-link/route')
    const res = await POST(makeRequest({ agentId: 'agent-1', planTier: 'enterprise' }))

    expect(res.status).toBe(400)
    expect((res as any).body.error).toMatch(/planTier/)
  })

  it('returns 404 when agent is not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { POST } = await import('../app/api/admin/create-payment-link/route')
    const res = await POST(makeRequest({ agentId: 'nonexistent', planTier: 'pro' }))

    expect(res.status).toBe(404)
  })

  it('returns payment link URL on success (starter tier)', async () => {
    const { POST } = await import('../app/api/admin/create-payment-link/route')
    const res = await POST(makeRequest({ agentId: 'agent-uuid-1', planTier: 'starter' }))

    expect(res.status).toBe(200)
    expect((res as any).body.url).toBe('https://buy.stripe.com/test_abc123')
    expect((res as any).body.planTier).toBe('starter')
    expect((res as any).body.agentId).toBe('agent-uuid-1')
  })

  it('returns payment link URL on success (pro tier)', async () => {
    const { POST } = await import('../app/api/admin/create-payment-link/route')
    const res = await POST(makeRequest({ agentId: 'agent-uuid-1', planTier: 'pro' }))

    expect(res.status).toBe(200)
    expect((res as any).body.url).toMatch(/^https:\/\/buy\.stripe\.com\//)
  })

  it('returns payment link URL on success (team tier)', async () => {
    const { POST } = await import('../app/api/admin/create-payment-link/route')
    const res = await POST(makeRequest({ agentId: 'agent-uuid-1', planTier: 'team' }))

    expect(res.status).toBe(200)
    expect((res as any).body.url).toBeTruthy()
  })

  it('reuses existing price when lookup key matches', async () => {
    mockPricesList.mockResolvedValue({ data: [{ id: 'price_existing_abc' }] })

    const { POST } = await import('../app/api/admin/create-payment-link/route')
    await POST(makeRequest({ agentId: 'agent-uuid-1', planTier: 'pro' }))

    // Should NOT create a new price since one was found
    expect(mockPricesCreate).not.toHaveBeenCalled()

    // Should use existing price in payment link
    expect(mockPaymentLinksCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_existing_abc', quantity: 1 }],
      })
    )
  })

  it('creates a new price when none exists for the lookup key', async () => {
    mockPricesList.mockResolvedValue({ data: [] })
    mockPricesCreate.mockResolvedValue({ id: 'price_new_xyz' })

    const { POST } = await import('../app/api/admin/create-payment-link/route')
    await POST(makeRequest({ agentId: 'agent-uuid-1', planTier: 'starter' }))

    expect(mockPricesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'usd',
        unit_amount: 4900, // $49 in cents
        recurring: { interval: 'month' },
        lookup_key: 'leadflow_starter_monthly',
      })
    )
  })

  it('includes agent_id and plan_tier in payment link metadata', async () => {
    const { POST } = await import('../app/api/admin/create-payment-link/route')
    await POST(makeRequest({ agentId: 'agent-uuid-1', planTier: 'team' }))

    expect(mockPaymentLinksCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          agent_id: 'agent-uuid-1',
          plan_tier: 'team',
          source: 'admin_payment_link',
        }),
      })
    )
  })

  it('includes existing stripe_customer_id in metadata when agent has one', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'agent-uuid-1',
        email: 'agent@test.com',
        stripe_customer_id: 'cus_existing_123',
        plan_tier: 'pro',
      },
      error: null,
    })

    const { POST } = await import('../app/api/admin/create-payment-link/route')
    await POST(makeRequest({ agentId: 'agent-uuid-1', planTier: 'pro' }))

    expect(mockPaymentLinksCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          existing_stripe_customer_id: 'cus_existing_123',
        }),
      })
    )
  })

  it('returns 500 when Stripe throws an error', async () => {
    mockPaymentLinksCreate.mockRejectedValue(new Error('Stripe error'))

    const { POST } = await import('../app/api/admin/create-payment-link/route')
    const res = await POST(makeRequest({ agentId: 'agent-uuid-1', planTier: 'pro' }))

    expect(res.status).toBe(500)
    expect((res as any).body.error).toBe('Failed to create payment link')
  })

  it('creates price with correct amounts for all tiers', async () => {
    const { POST } = await import('../app/api/admin/create-payment-link/route')

    const tiers = [
      { tier: 'starter', amount: 4900 },
      { tier: 'pro', amount: 14900 },
      { tier: 'team', amount: 39900 },
    ]

    for (const { tier, amount } of tiers) {
      jest.clearAllMocks()
      mockRequireAdmin.mockResolvedValue(true)
      mockSingle.mockResolvedValue({
        data: { id: 'agent-1', email: 'x@test.com', stripe_customer_id: null, plan_tier: tier },
        error: null,
      })
      mockEq.mockReturnValue({ single: mockSingle })
      mockSelect.mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })
      mockPricesList.mockResolvedValue({ data: [] })
      mockPricesCreate.mockResolvedValue({ id: `price_${tier}` })
      mockPaymentLinksCreate.mockResolvedValue({ id: 'plink_1', url: 'https://buy.stripe.com/x' })

      jest.resetModules()
      // Re-mock after resetModules
      jest.mock('next/server', () => ({
        NextResponse: { json: jest.fn((body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 })) },
      }))
      jest.mock('../lib/services/AuthService', () => ({ requireAdmin: () => mockRequireAdmin() }))
      jest.mock('../lib/logger', () => ({ logger: { info: jest.fn(), error: jest.fn() } }))
      jest.mock('stripe', () => jest.fn().mockImplementation(() => ({
        prices: { list: mockPricesList, create: mockPricesCreate },
        paymentLinks: { create: mockPaymentLinksCreate },
      })))
      jest.mock('../lib/db', () => ({ postgrestAdmin: { from: (...args: unknown[]) => mockFrom(...args) } }))

      const mod = await import('../app/api/admin/create-payment-link/route')
      await mod.POST(makeRequest({ agentId: 'agent-1', planTier: tier }))

      expect(mockPricesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ unit_amount: amount })
      )
    }
  })
})

// ─── Webhook: payment link support ───────────────────────────────────────────

describe('Stripe webhook handleCheckoutComplete — payment link support', () => {
  it('webhook route supports metadata.agent_id as fallback for client_reference_id', () => {
    const fs = require('fs')
    const path = require('path')
    const routePath = path.resolve(__dirname, '../app/api/webhooks/stripe/route.ts')
    const source = fs.readFileSync(routePath, 'utf-8')

    // Must fall back to metadata.agent_id when client_reference_id is null
    expect(source).toMatch(/metadata\?\.agent_id/)

    // Must use metadata plan_tier as tier override
    expect(source).toMatch(/metadata\?\.plan_tier/)
  })
})

// ─── Payment-ready API ────────────────────────────────────────────────────────

describe('GET /api/admin/payment-ready', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()

    mockRequireAdmin.mockResolvedValue(true)

    const mockOrder = jest.fn().mockResolvedValue({
      data: [
        { id: 'a1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com', plan_tier: 'pro', stripe_customer_id: null, created_at: '2026-01-01T00:00:00Z' },
      ],
      error: null,
    })
    const mockEqStatus = jest.fn().mockReturnValue({ order: mockOrder })
    const mockEqCompleted = jest.fn().mockReturnValue({ eq: mockEqStatus })
    const mockEqVerified = jest.fn().mockReturnValue({ eq: mockEqCompleted })
    const mockSelectPR = jest.fn().mockReturnValue({ eq: mockEqVerified })
    mockFrom.mockReturnValue({ select: mockSelectPR })
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue(false)

    jest.mock('next/server', () => ({
      NextResponse: { json: jest.fn((body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 })) },
    }))
    jest.mock('../lib/services/AuthService', () => ({ requireAdmin: () => mockRequireAdmin() }))
    jest.mock('../lib/logger', () => ({ logger: { info: jest.fn(), error: jest.fn() } }))
    jest.mock('../lib/db', () => ({ postgrestAdmin: { from: (...args: unknown[]) => mockFrom(...args) } }))

    const { GET } = await import('../app/api/admin/payment-ready/route')
    const res = await GET({ headers: { get: jest.fn() } } as any)

    expect(res.status).toBe(401)
  })

  it('returns list of payment-ready agents', async () => {
    jest.mock('next/server', () => ({
      NextResponse: { json: jest.fn((body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 })) },
    }))
    jest.mock('../lib/services/AuthService', () => ({ requireAdmin: () => mockRequireAdmin() }))
    jest.mock('../lib/logger', () => ({ logger: { info: jest.fn(), error: jest.fn() } }))
    jest.mock('../lib/db', () => ({ postgrestAdmin: { from: (...args: unknown[]) => mockFrom(...args) } }))

    const { GET } = await import('../app/api/admin/payment-ready/route')
    const res = await GET({ headers: { get: jest.fn() } } as any)

    expect(res.status).toBe(200)
    const agents = (res as any).body.agents
    expect(Array.isArray(agents)).toBe(true)
    expect(agents[0].email).toBe('jane@test.com')
    expect(agents[0].name).toBe('Jane Doe')
  })
})
