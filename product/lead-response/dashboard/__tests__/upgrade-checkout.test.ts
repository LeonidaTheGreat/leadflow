/**
 * Tests for POST /api/stripe/upgrade-checkout
 *
 * Verifies the self-serve pilot-to-paid upgrade checkout flow:
 * - Rejects unauthenticated requests (no cookie)
 * - Rejects invalid plans
 * - Creates a Stripe checkout session and returns the URL
 * - Reuses an existing Stripe customer
 * - Handles missing agent gracefully
 */

// ── Set env vars BEFORE mocks and require so module-level initialisation works ─
process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.JWT_SECRET = 'test-secret'
process.env.STRIPE_PRICE_STARTER_MONTHLY = 'price_starter_monthly_test'
process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = 'price_pro_monthly_test'
process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY = 'price_team_monthly_test'

// ── Mock next/server ──────────────────────────────────────────────────────────

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(
      (body: unknown, init?: { status?: number }) => ({
        body,
        status: init?.status ?? 200,
        async json() { return body },
      })
    ),
  },
}))

// ── Stripe mock ───────────────────────────────────────────────────────────────

const mockCheckoutCreate = jest.fn().mockResolvedValue({
  id: 'cs_test_abc123',
  url: 'https://checkout.stripe.com/test/abc123',
})
const mockCustomerCreate = jest.fn().mockResolvedValue({ id: 'cus_test_xyz' })

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    customers: { create: mockCustomerCreate },
    checkout: { sessions: { create: mockCheckoutCreate } },
  }))
)

// ── JWT mock ──────────────────────────────────────────────────────────────────

const mockJwtVerify = jest.fn().mockReturnValue({ userId: 'agent-123', email: 'test@example.com' })
jest.mock('jsonwebtoken', () => ({ verify: (...args: unknown[]) => mockJwtVerify(...args) }))

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockInsert = jest.fn().mockResolvedValue({ error: null })
const mockSingle = jest.fn().mockResolvedValue({
  data: {
    id: 'agent-123',
    email: 'test@example.com',
    stripe_customer_id: null,
    plan_tier: 'pilot',
    first_name: 'Test',
    last_name: 'Agent',
  },
  error: null,
})
const mockUpdateEq = jest.fn().mockResolvedValue({ error: null })
const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq })

const mockFrom = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: mockSingle,
  update: mockUpdate,
  insert: mockInsert,
})

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({ from: (...args: unknown[]) => mockFrom(...args) }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(
  body: object,
  cookieValue: string | null = 'valid.jwt.token'
) {
  return {
    json: () => Promise.resolve(body),
    cookies: {
      get: (key: string) => {
        if (key === 'auth-token' && cookieValue !== null) {
          return { value: cookieValue }
        }
        return undefined
      },
    },
  }
}

// ── Load route AFTER all mocks ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('../app/api/stripe/upgrade-checkout/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NextResponse } = require('next/server')

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/stripe/upgrade-checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Restore default mock behaviour after each clear
    mockJwtVerify.mockReturnValue({ userId: 'agent-123', email: 'test@example.com' })
    mockSingle.mockResolvedValue({
      data: {
        id: 'agent-123',
        email: 'test@example.com',
        stripe_customer_id: null,
        plan_tier: 'pilot',
        first_name: 'Test',
        last_name: 'Agent',
      },
      error: null,
    })
    mockCheckoutCreate.mockResolvedValue({
      id: 'cs_test_abc123',
      url: 'https://checkout.stripe.com/test/abc123',
    })
    mockInsert.mockResolvedValue({ error: null })
  })

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when no auth cookie is present', async () => {
    const req = makeRequest({ plan: 'pro' }, null)
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/not authenticated/i) }),
      expect.objectContaining({ status: 401 })
    )
  })

  it('returns 401 when JWT is invalid', async () => {
    mockJwtVerify.mockImplementation(() => { throw new Error('invalid token') })
    const req = makeRequest({ plan: 'pro' })
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/invalid token/i) }),
      expect.objectContaining({ status: 401 })
    )
  })

  // ── Plan validation ───────────────────────────────────────────────────────

  it('returns 400 for an invalid plan string', async () => {
    const req = makeRequest({ plan: 'invalid_plan' })
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/invalid plan/i) }),
      expect.objectContaining({ status: 400 })
    )
  })

  it('returns 400 when plan is missing from body', async () => {
    const req = makeRequest({})
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/invalid plan/i) }),
      expect.objectContaining({ status: 400 })
    )
  })

  // ── Successful checkout sessions ──────────────────────────────────────────

  it.each(['starter', 'pro', 'team'] as const)(
    'creates a checkout session and returns URL for plan: %s',
    async (plan) => {
      const req = makeRequest({ plan })
      await POST(req)
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://checkout.stripe.com/test/abc123',
          sessionId: 'cs_test_abc123',
        })
      )
    }
  )

  it('creates a new Stripe customer when none exists', async () => {
    const req = makeRequest({ plan: 'pro' })
    await POST(req)
    expect(mockCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        metadata: expect.objectContaining({ agent_id: 'agent-123' }),
      })
    )
  })

  it('reuses an existing Stripe customer ID without creating a new one', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'agent-123',
        email: 'test@example.com',
        stripe_customer_id: 'cus_existing_456',
        plan_tier: 'pilot',
        first_name: 'Test',
        last_name: 'Agent',
      },
      error: null,
    })
    const req = makeRequest({ plan: 'pro' })
    await POST(req)
    expect(mockCustomerCreate).not.toHaveBeenCalled()
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing_456' })
    )
  })

  it('sets upgraded_from=pilot in subscription_data metadata', async () => {
    const req = makeRequest({ plan: 'starter' })
    await POST(req)
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.objectContaining({
          metadata: expect.objectContaining({ upgraded_from: 'pilot' }),
        }),
      })
    )
  })

  it('points success_url to /settings/billing?upgrade=success', async () => {
    const req = makeRequest({ plan: 'pro' })
    await POST(req)
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining('/settings/billing?upgrade=success'),
      })
    )
  })

  // ── Error cases ───────────────────────────────────────────────────────────

  it('returns 404 when agent is not found in the database', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const req = makeRequest({ plan: 'pro' })
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/agent not found/i) }),
      expect.objectContaining({ status: 404 })
    )
  })
})
