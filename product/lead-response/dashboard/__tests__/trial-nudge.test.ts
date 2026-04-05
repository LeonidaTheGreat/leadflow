/**
 * Tests for:
 * - GET /api/trial/nudge
 * - POST /api/trial/dismiss-nudge
 *
 * Verifies:
 * - Unauthenticated requests return 401
 * - Paid agents get shouldShow: false
 * - Trial agents with >7 days remaining get shouldShow: false
 * - Trial agents with <=7 days remaining get shouldShow: true
 * - Expired trial agents get shouldShow: true and isExpired: true (ignores dismissal)
 * - Dismissed banner is respected for non-expired trials
 * - Dismiss endpoint sets trial_banner_dismissed = true
 */

process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
process.env.JWT_SECRET = 'test-secret'
process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = 'price_pro_real_test_id'
process.env.NEXT_PUBLIC_APP_URL = 'https://leadflow-ai-five.vercel.app'

// ── next/server mock ──────────────────────────────────────────────────────────
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
  id: 'cs_test_nudge',
  url: 'https://checkout.stripe.com/test/nudge',
})
const mockCustomerCreate = jest.fn().mockResolvedValue({ id: 'cus_nudge_test' })

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    customers: { create: mockCustomerCreate },
    checkout: { sessions: { create: mockCheckoutCreate } },
  }))
)

// ── JWT mock ──────────────────────────────────────────────────────────────────
const mockJwtVerify = jest.fn().mockReturnValue({ userId: 'agent-uuid-1', email: 'test@example.com' })
jest.mock('jsonwebtoken', () => ({ verify: (...args: unknown[]) => mockJwtVerify(...args) }))

// ── DB mock ───────────────────────────────────────────────────────────────────
const mockSingle = jest.fn()
const mockUpdateEq = jest.fn().mockResolvedValue({ error: null })
const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq })

const mockFrom = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: mockSingle,
  update: mockUpdate,
})

jest.mock('@/lib/db', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRequest(cookieValue: string | null = 'valid.jwt.token') {
  return {
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

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// ── Load routes AFTER mocks ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getNudge } = require('../app/api/trial/nudge/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST: dismissNudge } = require('../app/api/trial/dismiss-nudge/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NextResponse } = require('next/server')

// ── Tests: GET /api/trial/nudge ────────────────────────────────────────────────
describe('GET /api/trial/nudge', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockJwtVerify.mockReturnValue({ userId: 'agent-uuid-1', email: 'test@example.com' })
  })

  it('returns 401 when not authenticated', async () => {
    mockJwtVerify.mockImplementation(() => { throw new Error('invalid token') })
    const req = makeRequest(null)
    const res = await getNudge(req)
    expect(res.status).toBe(401)
  })

  it('returns shouldShow: false for paid agents', async () => {
    mockSingle.mockResolvedValue({
      data: {
        plan_tier: 'pro',
        trial_ends_at: null,
        pilot_expires_at: null,
        trial_banner_dismissed: false,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'Agent',
        stripe_customer_id: null,
      },
      error: null,
    })
    const res = await getNudge(makeRequest())
    const body = await res.json()
    expect(body.shouldShow).toBe(false)
  })

  it('returns shouldShow: false when trial expires in 8+ days', async () => {
    mockSingle.mockResolvedValue({
      data: {
        plan_tier: 'trial',
        trial_ends_at: daysFromNow(10),
        pilot_expires_at: null,
        trial_banner_dismissed: false,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'Agent',
        stripe_customer_id: null,
      },
      error: null,
    })
    const res = await getNudge(makeRequest())
    const body = await res.json()
    expect(body.shouldShow).toBe(false)
  })

  it('returns shouldShow: true with checkout URL when trial expires in <=7 days', async () => {
    mockSingle.mockResolvedValue({
      data: {
        plan_tier: 'trial',
        trial_ends_at: daysFromNow(3),
        pilot_expires_at: null,
        trial_banner_dismissed: false,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'Agent',
        stripe_customer_id: null,
      },
      error: null,
    })
    const res = await getNudge(makeRequest())
    const body = await res.json()
    expect(body.shouldShow).toBe(true)
    expect(body.isExpired).toBe(false)
    expect(body.daysRemaining).toBe(3)
    expect(typeof body.checkoutUrl).toBe('string')
    expect(body.checkoutUrl.length).toBeGreaterThan(0)
  })

  it('returns shouldShow: true when trial is expired, regardless of dismissal', async () => {
    mockSingle.mockResolvedValue({
      data: {
        plan_tier: 'trial',
        trial_ends_at: daysAgo(2),
        pilot_expires_at: null,
        trial_banner_dismissed: true, // dismissed but expired
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'Agent',
        stripe_customer_id: null,
      },
      error: null,
    })
    const res = await getNudge(makeRequest())
    const body = await res.json()
    expect(body.shouldShow).toBe(true)
    expect(body.isExpired).toBe(true)
    expect(body.daysRemaining).toBe(0)
  })

  it('returns shouldShow: false when banner is dismissed and trial not yet expired', async () => {
    mockSingle.mockResolvedValue({
      data: {
        plan_tier: 'trial',
        trial_ends_at: daysFromNow(5),
        pilot_expires_at: null,
        trial_banner_dismissed: true,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'Agent',
        stripe_customer_id: null,
      },
      error: null,
    })
    const res = await getNudge(makeRequest())
    const body = await res.json()
    expect(body.shouldShow).toBe(false)
  })

  it('handles pilot plan the same way as trial', async () => {
    mockSingle.mockResolvedValue({
      data: {
        plan_tier: 'pilot',
        trial_ends_at: null,
        pilot_expires_at: daysFromNow(2),
        trial_banner_dismissed: false,
        email: 'pilot@example.com',
        first_name: 'Pilot',
        last_name: 'User',
        stripe_customer_id: 'cus_existing',
      },
      error: null,
    })
    const res = await getNudge(makeRequest())
    const body = await res.json()
    expect(body.shouldShow).toBe(true)
    expect(body.isPilot).toBe(true)
    expect(body.daysRemaining).toBe(2)
  })

  it('returns 404 when agent not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('not found') })
    const res = await getNudge(makeRequest())
    expect(res.status).toBe(404)
  })
})

// ── Tests: POST /api/trial/dismiss-nudge ─────────────────────────────────────
describe('POST /api/trial/dismiss-nudge', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockJwtVerify.mockReturnValue({ userId: 'agent-uuid-1', email: 'test@example.com' })
  })

  it('returns 401 when not authenticated', async () => {
    mockJwtVerify.mockImplementation(() => { throw new Error('invalid token') })
    const res = await dismissNudge(makeRequest(null))
    expect(res.status).toBe(401)
  })

  it('sets trial_banner_dismissed = true and returns success', async () => {
    mockUpdateEq.mockResolvedValue({ error: null })
    const res = await dismissNudge(makeRequest())
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ trial_banner_dismissed: true })
    )
  })

  it('returns 500 when DB update fails', async () => {
    mockUpdateEq.mockResolvedValue({ error: new Error('DB error') })
    const res = await dismissNudge(makeRequest())
    expect(res.status).toBe(500)
  })
})
