/**
 * @jest-environment node
 */

/**
 * Tests for /api/analytics/dashboard endpoint — session protection
 *
 * Security fix: the dashboard analytics route was excluded from middleware
 * matcher and had no in-handler session validation. Any unauthenticated
 * request could hit the endpoint.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSession = { id: 'sess-1', userId: 'agent-456' }

jest.mock('@/lib/session', () => ({
  validateSession: jest.fn(),
}))

jest.mock('@/lib/analytics-queries', () => ({
  getMessagesPerDay: jest.fn().mockResolvedValue({ data: [], error: null }),
  getDeliveryStats: jest.fn().mockResolvedValue({ sent: 0, delivered: 0, failed: 0, pending: 0, error: null }),
  getResponseRate: jest.fn().mockResolvedValue({ totalSent: 0, totalResponded: 0, responseRate: 0, error: null }),
  getSequenceCompletion: jest.fn().mockResolvedValue({ started: 0, completed: 0, completionRate: 0, error: null }),
  getLeadConversion: jest.fn().mockResolvedValue({ totalLeads: 0, convertedLeads: 0, conversionRate: 0, error: null }),
  getAvgResponseTime: jest.fn().mockResolvedValue({ avgResponseTime: 0, medianResponseTime: 0, error: null }),
}))

import { validateSession } from '@/lib/session'
import { GET } from '../app/api/analytics/dashboard/route'
import { NextRequest } from 'next/server'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(
  params: Record<string, string> = {},
  cookies: Record<string, string> = { leadflow_session: 'valid-token' }
): NextRequest {
  const url = new URL('http://localhost/api/analytics/dashboard')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const req = new NextRequest(url.toString(), {
    method: 'GET',
    headers: {
      cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
    },
  })
  return req
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/analytics/dashboard — Auth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(validateSession as jest.Mock).mockResolvedValue(mockSession)
  })

  it('returns 401 when no session cookie is present', async () => {
    const req = makeRequest({}, {})
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when session token is invalid', async () => {
    ;(validateSession as jest.Mock).mockResolvedValue(null)
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 200 with valid session', async () => {
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
  })

  it('returns private cache headers (not public)', async () => {
    const req = makeRequest()
    const res = await GET(req)
    const cacheControl = res.headers.get('Cache-Control')
    expect(cacheControl).toContain('private')
    expect(cacheControl).not.toContain('public')
  })

  it('validates days parameter', async () => {
    const req = makeRequest({ days: '0' })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('accepts valid days parameter with auth', async () => {
    const req = makeRequest({ days: '7' })
    const res = await GET(req)
    expect(res.status).toBe(200)
  })
})
