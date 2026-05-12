/**
 * Tests for POST /api/billing/create-checkout
 *
 * This is the primary checkout route called by the pricing page when a user
 * clicks "Start Free Trial" or "Get Started".
 *
 * Regression coverage:
 * - Canonical env var names (STRIPE_PRICE_PRO_MONTHLY, not PROFESSIONAL)
 * - Price ID format validation (rejects placeholders)
 * - Returns 200 with checkout URL for valid starter/pro/team monthly tiers
 *
 * Root cause of the zero-conversion bug (2026-05-12):
 * Vercel had STRIPE_PRICE_PROFESSIONAL_MONTHLY and STRIPE_PRICE_ENTERPRISE_MONTHLY
 * but the route reads STRIPE_PRICE_PRO_MONTHLY and STRIPE_PRICE_TEAM_MONTHLY.
 * Every pro/team checkout silently returned 503 PRICE_NOT_CONFIGURED.
 * Fix: added canonical-named vars to Vercel (all environments).
 */

// ── Set env vars BEFORE mocks so module-level initialisation picks them up ──
process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8788'
process.env.API_SECRET_KEY = 'test-service-role-key'
// Canonical env var names — MUST match PRICE_ID_ENV_MAP in create-checkout/route.ts
// Real Stripe format: price_ + 14+ alphanumeric chars (no underscores)
process.env.STRIPE_PRICE_STARTER_MONTHLY = 'price_1TestStarterABC1234'
process.env.STRIPE_PRICE_PRO_MONTHLY     = 'price_1TestProMonthlyXYZ'
process.env.STRIPE_PRICE_TEAM_MONTHLY    = 'price_1TestTeamMonthABC1'

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
  url: 'https://checkout.stripe.com/pay/cs_test_abc123',
})
const mockCustomerCreate = jest.fn().mockResolvedValue({ id: 'cus_test_new' })
const mockCustomersList = jest.fn().mockResolvedValue({ data: [] })

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    customers: { create: mockCustomerCreate, list: mockCustomersList },
    checkout: { sessions: { create: mockCheckoutCreate } },
  }))
)

// ── DB mock (supabase-server → db.ts) ────────────────────────────────────────

const mockSingle = jest.fn().mockResolvedValue({
  data: { id: 'a1b2c3d4-e5f6-7890-abcd-ef0123456789', email: 'pilot@test.com' },
  error: null,
})
const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })

const mockFrom = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: mockSingle,
  insert: mockInsert,
})

jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: { from: (...args: unknown[]) => mockFrom(...args) },
  isSupabaseConfigured: jest.fn().mockReturnValue(true),
}))

// ── Load route AFTER mocks ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('../app/api/billing/create-checkout/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NextResponse } = require('next/server')

// ── Request factory ───────────────────────────────────────────────────────────

// Valid UUID v4 format for agent IDs
const VALID_AGENT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef0123456789'

// Each test gets a unique IP to avoid the in-memory rate limiter bleeding state.
// The route allows 5 requests/min per IP; tests would collide if they shared an IP.
let ipCounter = 1
function nextIp() { return `10.0.${Math.floor(ipCounter / 256)}.${ipCounter++ % 256}` }

function makeRequest(
  body: object,
  opts: { agentIdHeader?: string | null; ip?: string } = {}
) {
  const ip = opts.ip ?? nextIp()
  const headers: Record<string, string | null> = {
    'x-forwarded-for': ip,
  }
  if (opts.agentIdHeader !== undefined) {
    headers['x-agent-id'] = opts.agentIdHeader
  }

  return {
    json: () => Promise.resolve(body),
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
    url: 'https://leadflow-ai-five.vercel.app/api/billing/create-checkout',
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/billing/create-checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSingle.mockResolvedValue({
      data: { id: VALID_AGENT_ID, email: 'pilot@test.com' },
      error: null,
    })
    mockInsert.mockResolvedValue({ data: null, error: null })
    mockCustomerCreate.mockResolvedValue({ id: 'cus_test_new' })
    mockCustomersList.mockResolvedValue({ data: [] })
    mockCheckoutCreate.mockResolvedValue({
      id: 'cs_test_abc123',
      url: 'https://checkout.stripe.com/pay/cs_test_abc123',
    })
  })

  // ── Input validation ──────────────────────────────────────────────────────

  it('returns 400 when tier is missing', async () => {
    const req = makeRequest({ agentId: VALID_AGENT_ID, email: 'test@test.com' })
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'MISSING_FIELDS' }),
      expect.objectContaining({ status: 400 })
    )
  })

  it('returns 400 when agentId is missing', async () => {
    const req = makeRequest({ tier: 'pro_monthly', email: 'test@test.com' })
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'MISSING_FIELDS' }),
      expect.objectContaining({ status: 400 })
    )
  })

  it('returns 400 for invalid tier name', async () => {
    const req = makeRequest({ tier: 'professional_monthly', agentId: VALID_AGENT_ID, email: 'test@test.com' })
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_TIER' }),
      expect.objectContaining({ status: 400 })
    )
  })

  it('returns 400 for invalid agentId (not a UUID)', async () => {
    const req = makeRequest({ tier: 'pro_monthly', agentId: 'not-a-uuid', email: 'test@test.com' })
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_AGENT_ID' }),
      expect.objectContaining({ status: 400 })
    )
  })

  it('returns 403 when x-agent-id header does not match body agentId', async () => {
    const req = makeRequest(
      { tier: 'pro_monthly', agentId: VALID_AGENT_ID, email: 'test@test.com' },
      { agentIdHeader: 'b2c3d4e5-f6a7-8901-bcde-f01234567890' }
    )
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'UNAUTHORIZED' }),
      expect.objectContaining({ status: 403 })
    )
  })

  // ── Successful checkout sessions ──────────────────────────────────────────

  it('creates a checkout session and returns URL for starter_monthly', async () => {
    const req = makeRequest(
      { tier: 'starter_monthly', agentId: VALID_AGENT_ID, email: 'pilot@test.com' },
      { agentIdHeader: VALID_AGENT_ID }
    )
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://checkout.stripe.com/pay/cs_test_abc123' })
    )
  })

  it('creates a checkout session and returns URL for pro_monthly', async () => {
    const req = makeRequest(
      { tier: 'pro_monthly', agentId: VALID_AGENT_ID, email: 'pilot@test.com' },
      { agentIdHeader: VALID_AGENT_ID }
    )
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://checkout.stripe.com/pay/cs_test_abc123' })
    )
  })

  it('creates a checkout session and returns URL for team_monthly', async () => {
    const req = makeRequest(
      { tier: 'team_monthly', agentId: VALID_AGENT_ID, email: 'pilot@test.com' },
      { agentIdHeader: VALID_AGENT_ID }
    )
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://checkout.stripe.com/pay/cs_test_abc123' })
    )
  })

  it('includes a 14-day trial in the subscription_data', async () => {
    const req = makeRequest(
      { tier: 'pro_monthly', agentId: VALID_AGENT_ID, email: 'pilot@test.com' },
      { agentIdHeader: VALID_AGENT_ID }
    )
    await POST(req)
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.objectContaining({ trial_period_days: 14 }),
      })
    )
  })

  it('success_url includes /dashboard?session_id=', async () => {
    const req = makeRequest(
      { tier: 'pro_monthly', agentId: VALID_AGENT_ID, email: 'pilot@test.com' },
      { agentIdHeader: VALID_AGENT_ID }
    )
    await POST(req)
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining('/dashboard?session_id='),
      })
    )
  })

  // ── Canonical env var regression guards ───────────────────────────────────
  // These tests catch the bug where STRIPE_PRICE_PRO_MONTHLY / STRIPE_PRICE_TEAM_MONTHLY
  // were not set in Vercel, causing every pro/team checkout to return 503.

  it('uses STRIPE_PRICE_PRO_MONTHLY (canonical) — returns 503 if it is missing', async () => {
    const original = process.env.STRIPE_PRICE_PRO_MONTHLY
    delete process.env.STRIPE_PRICE_PRO_MONTHLY
    const req = makeRequest(
      { tier: 'pro_monthly', agentId: VALID_AGENT_ID, email: 'pilot@test.com' },
      { agentIdHeader: VALID_AGENT_ID }
    )
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PRICE_NOT_CONFIGURED', envVar: 'STRIPE_PRICE_PRO_MONTHLY' }),
      expect.objectContaining({ status: 503 })
    )
    process.env.STRIPE_PRICE_PRO_MONTHLY = original
  })

  it('uses STRIPE_PRICE_TEAM_MONTHLY (canonical) — returns 503 if it is missing', async () => {
    const original = process.env.STRIPE_PRICE_TEAM_MONTHLY
    delete process.env.STRIPE_PRICE_TEAM_MONTHLY
    const req = makeRequest(
      { tier: 'team_monthly', agentId: VALID_AGENT_ID, email: 'pilot@test.com' },
      { agentIdHeader: VALID_AGENT_ID }
    )
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PRICE_NOT_CONFIGURED', envVar: 'STRIPE_PRICE_TEAM_MONTHLY' }),
      expect.objectContaining({ status: 503 })
    )
    process.env.STRIPE_PRICE_TEAM_MONTHLY = original
  })

  it('rejects placeholder price IDs — returns 503 for pro_monthly with fake price', async () => {
    const original = process.env.STRIPE_PRICE_PRO_MONTHLY
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_149'
    const req = makeRequest(
      { tier: 'pro_monthly', agentId: VALID_AGENT_ID, email: 'pilot@test.com' },
      { agentIdHeader: VALID_AGENT_ID }
    )
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PRICE_NOT_CONFIGURED' }),
      expect.objectContaining({ status: 503 })
    )
    process.env.STRIPE_PRICE_PRO_MONTHLY = original
  })

  it('succeeds for pro_monthly when STRIPE_PRICE_PRO_MONTHLY is set (not PROFESSIONAL_MONTHLY)', async () => {
    // Regression guard: if the route used STRIPE_PRICE_PROFESSIONAL_MONTHLY (old legacy name,
    // not set in this test env), it would return 503. Canonical STRIPE_PRICE_PRO_MONTHLY
    // IS set at the top of this file, so checkout must succeed.
    const req = makeRequest(
      { tier: 'pro_monthly', agentId: VALID_AGENT_ID, email: 'pilot@test.com' },
      { agentIdHeader: VALID_AGENT_ID }
    )
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('checkout.stripe.com') })
    )
  })

  // ── Error cases ───────────────────────────────────────────────────────────

  it('returns 404 when agent is not found in the database', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    const req = makeRequest(
      { tier: 'pro_monthly', agentId: VALID_AGENT_ID, email: 'pilot@test.com' },
      { agentIdHeader: VALID_AGENT_ID }
    )
    await POST(req)
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AGENT_NOT_FOUND' }),
      expect.objectContaining({ status: 404 })
    )
  })

  it('returns 429 when rate limit is exceeded (same IP, > 5 requests/min)', async () => {
    // Use a dedicated IP to avoid polluting other tests' rate limit counters
    const dedicatedIp = '192.168.99.99'
    const body = { tier: 'pro_monthly', agentId: VALID_AGENT_ID, email: 'pilot@test.com' }

    // 5 requests allowed (count 1–5)
    for (let i = 0; i < 5; i++) {
      jest.clearAllMocks()
      mockSingle.mockResolvedValue({ data: { id: VALID_AGENT_ID, email: 'pilot@test.com' }, error: null })
      mockInsert.mockResolvedValue({ data: null, error: null })
      mockCustomersList.mockResolvedValue({ data: [] })
      mockCustomerCreate.mockResolvedValue({ id: 'cus_test_new' })
      mockCheckoutCreate.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/pay/test' })
      await POST(makeRequest(body, { agentIdHeader: VALID_AGENT_ID, ip: dedicatedIp }))
    }

    // 6th request must be rejected
    jest.clearAllMocks()
    await POST(makeRequest(body, { agentIdHeader: VALID_AGENT_ID, ip: dedicatedIp }))
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/too many requests/i) }),
      expect.objectContaining({ status: 429 })
    )
  })
})
