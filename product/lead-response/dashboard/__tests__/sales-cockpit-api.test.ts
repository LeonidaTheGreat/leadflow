/**
 * @jest-environment node
 */

// Sales Cockpit API route unit tests
// Tests auth enforcement and input validation for the 3 sales cockpit routes.

jest.mock('../lib/services/AuthService', () => ({
  requireAdmin: jest.fn(),
}))

jest.mock('../lib/db', () => ({
  postgrestAdmin: {
    from: jest.fn(),
  },
}))

jest.mock('../lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

import { NextRequest } from 'next/server'
import { requireAdmin } from '../lib/services/AuthService'
import { postgrestAdmin } from '../lib/db'

const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>
const mockFrom = postgrestAdmin.from as jest.MockedFunction<typeof postgrestAdmin.from>

function makeRequest(body?: object, method = 'POST'): NextRequest {
  return new NextRequest('http://localhost/api/admin/sales-cockpit/outreach-log', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ─── outreach-log POST ────────────────────────────────────────────────────────

describe('POST /api/admin/sales-cockpit/outreach-log', () => {
  let handler: (req: NextRequest) => Promise<Response>

  beforeAll(async () => {
    const mod = await import('../app/api/admin/sales-cockpit/outreach-log/route')
    handler = mod.POST
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue(false)
    const res = await handler(makeRequest({ agentId: 'x', channel: 'email' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing agentId', async () => {
    mockRequireAdmin.mockResolvedValue(true)
    const res = await handler(makeRequest({ channel: 'email' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/agentId/)
  })

  it('returns 400 for invalid channel', async () => {
    mockRequireAdmin.mockResolvedValue(true)
    const res = await handler(makeRequest({ agentId: 'abc', channel: 'carrier-pigeon' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/channel/)
  })

  it('inserts log and returns 200 on success', async () => {
    mockRequireAdmin.mockResolvedValue(true)
    const fakeLog = { id: 'log-1', agent_id: 'agent-1', channel: 'email', notes: null, status: 'contacted', contacted_at: new Date().toISOString(), created_at: new Date().toISOString() }

    const mockQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fakeLog, error: null }),
    }
    mockFrom.mockReturnValue(mockQuery as any)

    const res = await handler(makeRequest({ agentId: 'agent-1', channel: 'email', status: 'contacted' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.log.id).toBe('log-1')
  })
})

// ─── outreach-log PATCH ───────────────────────────────────────────────────────

describe('PATCH /api/admin/sales-cockpit/outreach-log', () => {
  let handler: (req: NextRequest) => Promise<Response>

  beforeAll(async () => {
    const mod = await import('../app/api/admin/sales-cockpit/outreach-log/route')
    handler = mod.PATCH
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue(false)
    const res = await handler(makeRequest({ agentId: 'x', status: 'interested' }, 'PATCH'))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid status', async () => {
    mockRequireAdmin.mockResolvedValue(true)
    const res = await handler(makeRequest({ agentId: 'agent-1', status: 'maybe' }, 'PATCH'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/status/)
  })
})

// ─── main GET ─────────────────────────────────────────────────────────────────

describe('GET /api/admin/sales-cockpit', () => {
  let handler: (req: NextRequest) => Promise<Response>

  beforeAll(async () => {
    const mod = await import('../app/api/admin/sales-cockpit/route')
    handler = mod.GET
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdmin.mockResolvedValue(false)
    const req = new NextRequest('http://localhost/api/admin/sales-cockpit', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })

  it('returns empty agents array when no agents found', async () => {
    mockRequireAdmin.mockResolvedValue(true)

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    }

    mockQuery.order.mockResolvedValueOnce({ data: [], error: null })
    mockFrom.mockReturnValue(mockQuery as any)

    const req = new NextRequest('http://localhost/api/admin/sales-cockpit', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.agents).toEqual([])
  })
})
