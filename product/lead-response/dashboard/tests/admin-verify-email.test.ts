/**
 * @jest-environment node
 */

/**
 * Tests for Admin Email Verification Override
 * Task: e76c089e-6ca3-436f-944c-536f5c529eb0
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

let mockRequireAdmin = true
let fromImpl: (table: string) => any

jest.mock('@/lib/db', () => ({
  postgrestAdmin: {
    from: (table: string) => fromImpl(table),
  },
  supabaseAdmin: {
    from: (table: string) => fromImpl(table),
  },
}))

jest.mock('@/lib/services/AuthService', () => ({
  requireAdmin: jest.fn(() => Promise.resolve(mockRequireAdmin)),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

import { GET, POST } from '../app/api/admin/verify-email/route'
import { NextRequest } from 'next/server'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(method: 'GET' | 'POST', body?: object): NextRequest {
  const url = 'http://localhost/api/admin/verify-email'
  if (method === 'GET') {
    return new NextRequest(url, { method: 'GET' })
  }
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

const MOCK_AGENTS = [
  { id: 'agent-1', first_name: 'Alice', last_name: 'Smith', email: 'alice@example.com', created_at: '2026-07-01T00:00:00Z' },
  { id: 'agent-2', first_name: null, last_name: null, email: 'bob@example.com', created_at: '2026-07-02T00:00:00Z' },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/verify-email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAdmin = true
  })

  it('returns unverified agents', async () => {
    fromImpl = () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: MOCK_AGENTS, error: null }),
        }),
      }),
    })

    const res = await GET(makeRequest('GET'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.agents).toHaveLength(2)
    expect(data.agents[0]).toMatchObject({
      id: 'agent-1',
      name: 'Alice Smith',
      email: 'alice@example.com',
    })
    expect(data.agents[1]).toMatchObject({
      id: 'agent-2',
      name: 'bob@example.com',
      email: 'bob@example.com',
    })
  })

  it('returns 401 without admin auth', async () => {
    mockRequireAdmin = false
    fromImpl = () => ({ select: () => {} })

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 500 on DB error', async () => {
    fromImpl = () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
        }),
      }),
    })

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(500)
  })
})

describe('POST /api/admin/verify-email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAdmin = true
  })

  it('verifies a single agent by agentId', async () => {
    let updatedFilter: any = null

    fromImpl = () => ({
      update: (data: any) => ({
        eq: (col: string, val: any) => {
          if (col === 'email_verified') {
            return {
              eq: (col2: string, val2: any) => {
                updatedFilter = { col2, val2 }
                return Promise.resolve({ error: null })
              },
            }
          }
          return Promise.resolve({ error: null })
        },
      }),
    })

    const res = await POST(makeRequest('POST', { agentId: 'agent-1' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('verifies all unverified agents when all=true', async () => {
    fromImpl = () => ({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    const res = await POST(makeRequest('POST', { all: true }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('returns 400 when neither agentId nor all provided', async () => {
    fromImpl = () => ({})

    const res = await POST(makeRequest('POST', {}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/agentId or all required/)
  })

  it('returns 401 without admin auth', async () => {
    mockRequireAdmin = false
    fromImpl = () => ({})

    const res = await POST(makeRequest('POST', { agentId: 'agent-1' }))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 500 on DB error', async () => {
    fromImpl = () => ({
      update: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ error: { message: 'DB write error' } }),
        }),
      }),
    })

    const res = await POST(makeRequest('POST', { agentId: 'agent-1' }))
    expect(res.status).toBe(500)
  })
})
