/**
 * Tests for the pilot outreach email blast endpoint.
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

// ============================================================
// Mocks — must be declared before imports that use them
// ============================================================

const mockFrom = jest.fn()
const mockPostgrestAdmin = { from: mockFrom }

jest.mock('@/lib/db', () => ({
  postgrestAdmin: mockPostgrestAdmin,
}))

const mockSendPilotOutreachEmail = jest.fn()
jest.mock('@/lib/outreach-email-service', () => ({
  sendPilotOutreachEmail: mockSendPilotOutreachEmail,
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// ============================================================
// Helpers
// ============================================================

function makeRequest(
  method: 'GET' | 'POST',
  adminToken: string | null = 'test-secret'
): NextRequest {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (adminToken) {
    headers['x-admin-token'] = adminToken
  }
  return {
    method,
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
    json: async () => ({}),
  } as unknown as NextRequest
}

/** Build a chainable query-builder mock that resolves to { data, error } */
function mockQueryChain(result: { data: any; error: any }) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
    single: jest.fn().mockResolvedValue(result),
    then: (resolve: any) => Promise.resolve(result).then(resolve),
  }
  return chain
}

// ============================================================
// Tests
// ============================================================

describe('POST /api/admin/outreach/blast', () => {
  let POST: (request: NextRequest) => Promise<any>

  beforeAll(async () => {
    process.env.ADMIN_SECRET = 'test-secret'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.landyourleads.com'
    const mod = await import('@/app/api/admin/outreach/blast/route')
    POST = mod.POST
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when admin token is missing', async () => {
    const req = makeRequest('POST', null)
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('returns 401 when admin token is wrong', async () => {
    const req = makeRequest('POST', 'wrong-token')
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('returns { sent: 0, skipped: 0, errors: [] } when no identified targets exist', async () => {
    mockFrom.mockReturnValue(mockQueryChain({ data: [], error: null }))

    const req = makeRequest('POST')
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ sent: 0, skipped: 0, errors: [] })
  })

  it('sends emails to all identified targets and records touchpoints', async () => {
    const targets = [
      { id: 'uuid-1', name: 'Alice Smith', email: 'alice@example.com', location: 'Austin, TX', notes: 'pain_point: slow follow-up', status: 'identified' },
      { id: 'uuid-2', name: 'Bob Jones', email: 'bob@example.com', location: 'Dallas, TX', notes: '', status: 'identified' },
    ]

    // Sequence: targets fetch → (per target: touchpoint check, token insert, touchpoint insert, target update)
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      // 1. targets SELECT
      if (callCount === 1) return mockQueryChain({ data: targets, error: null })
      // Even calls: touchpoint check (no existing), odd calls: insert/update operations
      return mockQueryChain({ data: null, error: null })
    })

    mockSendPilotOutreachEmail.mockResolvedValue(true)

    const req = makeRequest('POST')
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sent).toBe(2)
    expect(body.skipped).toBe(0)
    expect(body.errors).toHaveLength(0)
    expect(mockSendPilotOutreachEmail).toHaveBeenCalledTimes(2)
  })

  it('skips targets that already have an initial touchpoint', async () => {
    const targets = [
      { id: 'uuid-1', name: 'Alice Smith', email: 'alice@example.com', location: 'Austin', notes: '', status: 'identified' },
    ]

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return mockQueryChain({ data: targets, error: null })
      // Touchpoint check returns existing touchpoint
      return mockQueryChain({ data: { id: 'existing-touch-id' }, error: null })
    })

    mockSendPilotOutreachEmail.mockResolvedValue(true)

    const req = makeRequest('POST')
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sent).toBe(0)
    expect(body.skipped).toBe(1)
    expect(mockSendPilotOutreachEmail).not.toHaveBeenCalled()
  })

  it('skips targets with no email address', async () => {
    const targets = [
      { id: 'uuid-3', name: 'No Email', email: null, location: 'NYC', notes: '', status: 'identified' },
    ]

    mockFrom.mockReturnValue(mockQueryChain({ data: targets, error: null }))

    const req = makeRequest('POST')
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sent).toBe(0)
    expect(body.skipped).toBe(1)
    expect(mockSendPilotOutreachEmail).not.toHaveBeenCalled()
  })

  it('records error when email delivery fails and continues to next target', async () => {
    const targets = [
      { id: 'uuid-1', name: 'Alice', email: 'alice@example.com', location: 'Austin', notes: '', status: 'identified' },
      { id: 'uuid-2', name: 'Bob', email: 'bob@example.com', location: 'Dallas', notes: '', status: 'identified' },
    ]

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return mockQueryChain({ data: targets, error: null })
      return mockQueryChain({ data: null, error: null })
    })

    // First email fails, second succeeds
    mockSendPilotOutreachEmail
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)

    const req = makeRequest('POST')
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sent).toBe(1)
    expect(body.errors).toHaveLength(1)
    expect(body.errors[0]).toContain('alice@example.com')
  })

  it('sends personalized email with correct firstName and location', async () => {
    const targets = [
      { id: 'uuid-1', name: 'Jennifer Collins', email: 'jen@example.com', location: 'Miami, FL', notes: 'challenge: leads going cold', status: 'identified' },
    ]

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return mockQueryChain({ data: targets, error: null })
      return mockQueryChain({ data: null, error: null })
    })

    mockSendPilotOutreachEmail.mockResolvedValue(true)

    const req = makeRequest('POST')
    await POST(req)

    expect(mockSendPilotOutreachEmail).toHaveBeenCalledWith(
      'jen@example.com',
      'uuid-1',
      expect.objectContaining({
        firstName: 'Jennifer',
        location: 'Miami, FL',
        demoLink: expect.stringContaining('https://app.landyourleads.com/demo/'),
      })
    )
  })
})

describe('GET /api/admin/outreach/blast', () => {
  let GET: (request: NextRequest) => Promise<any>

  beforeAll(async () => {
    process.env.ADMIN_SECRET = 'test-secret'
    const mod = await import('@/app/api/admin/outreach/blast/route')
    GET = mod.GET
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 for missing token', async () => {
    const req = makeRequest('GET', null)
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('returns stats broken down by status', async () => {
    const targets = [
      { id: '1', status: 'identified' },
      { id: '2', status: 'identified' },
      { id: '3', status: 'contacted' },
      { id: '4', status: 'responded' },
      { id: '5', status: 'signed_up' },
    ]

    mockFrom.mockReturnValue(mockQueryChain({ data: targets, error: null }))

    const req = makeRequest('GET')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.stats).toEqual({
      identified: 2,
      contacted: 1,
      responded: 1,
      signed_up: 1,
      total: 5,
    })
  })
})
