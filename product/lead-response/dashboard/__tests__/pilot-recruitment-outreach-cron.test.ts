/**
 * @jest-environment node
 *
 * Regression tests for /api/cron/pilot-recruitment-outreach.
 * Ensures Vercel cron GET triggers outreach blast execution.
 */

import { NextRequest } from 'next/server'

const mockRunBlast = jest.fn()

jest.mock('@/lib/services/pilot-outreach-blast-service', () => ({
  PilotOutreachBlastService: jest.fn().mockImplementation(() => ({
    runBlast: mockRunBlast,
  })),
}))

jest.mock('@/lib/db', () => ({
  postgrestAdmin: {},
}))

jest.mock('@/lib/outreach-email-service', () => ({
  sendPilotOutreachEmail: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

function makeRequest(method: 'GET' | 'POST', authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader) {
    headers.authorization = authHeader
  }

  return {
    method,
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
  } as unknown as NextRequest
}

describe('/api/cron/pilot-recruitment-outreach', () => {
  let GET: (request: NextRequest) => Promise<any>
  let POST: (request: NextRequest) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/cron/pilot-recruitment-outreach/route')
    GET = mod.GET
    POST = mod.POST
  })

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'test-cron-secret'
    mockRunBlast.mockResolvedValue({ sent: 3, skipped: 1, errors: [] })
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  it('returns 401 for GET without auth when CRON_SECRET is set', async () => {
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
    expect(mockRunBlast).not.toHaveBeenCalled()
  })

  it('runs blast on GET with valid auth', async () => {
    const res = await GET(makeRequest('GET', 'Bearer test-cron-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockRunBlast).toHaveBeenCalledTimes(1)
    expect(body).toEqual({ success: true, sent: 3, skipped: 1, errors: [] })
  })

  it('runs blast on POST with valid auth', async () => {
    const res = await POST(makeRequest('POST', 'Bearer test-cron-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockRunBlast).toHaveBeenCalledTimes(1)
    expect(body).toEqual({ success: true, sent: 3, skipped: 1, errors: [] })
  })
})
