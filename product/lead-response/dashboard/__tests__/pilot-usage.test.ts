/**
 * @jest-environment node
 *
 * Tests for GET /api/internal/pilot-usage endpoint (FR-4).
 * Task: fix-get-api-internal-pilot-usage-endpoint-does-not-exi
 */

import { NextRequest } from 'next/server'

const SERVICE_ROLE_KEY = 'test-service-role-key'

// ---- Supabase mock ----
const mockSelect = jest.fn()
const mockIn = jest.fn()
const mockOrder = jest.fn()
const mockEq = jest.fn()

// Chain builder for Supabase queries
function buildChain(result: unknown) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn(() => chain)
  chain.order = jest.fn(() => chain)
  chain.in = jest.fn(() => chain)
  chain.eq = jest.fn(() => chain)
  chain.then = jest.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve))
  // Make the chain a thenable so await works
  Object.defineProperty(chain, Symbol.toStringTag, { value: 'Promise' })
  return chain
}

const mockAgentsResult = {
  data: [
    { id: 'agent-1', email: 'alice@test.com', first_name: 'Alice', last_name: 'Smith', plan_tier: 'pilot' },
  ],
  error: null,
}

const mockSessionsResult = {
  data: [
    { id: 'session-1', agent_id: 'agent-1', session_start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), last_active_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  ],
  error: null,
}

const mockPageViewsResult = {
  data: [
    { agent_id: 'agent-1', page: '/dashboard/conversations' },
    { agent_id: 'agent-1', page: '/dashboard/conversations' },
    { agent_id: 'agent-1', page: '/dashboard' },
  ],
  error: null,
}

// Each call to `from()` returns a different mock chain based on the table name
let callCount = 0
const mockFrom = jest.fn((table: string) => {
  const results = [mockAgentsResult, mockSessionsResult, mockPageViewsResult]
  const result = results[callCount % results.length]
  callCount++
  return {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  }
})

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}))

// ---- Import after mocks ----
const { GET } = require('@/app/api/internal/pilot-usage/route')

function makeRequest(authToken?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authToken) headers['authorization'] = `Bearer ${authToken}`
  return new NextRequest('http://localhost/api/internal/pilot-usage', {
    method: 'GET',
    headers,
  })
}

describe('GET /api/internal/pilot-usage', () => {
  beforeEach(() => {
    callCount = 0
    mockFrom.mockClear()
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  })

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
  })

  it('returns 401 when no auth token provided', async () => {
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 for wrong auth token', async () => {
    const req = makeRequest('wrong-token')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns pilot data with correct structure when authorized', async () => {
    const req = makeRequest(SERVICE_ROLE_KEY)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('pilots')
    expect(json).toHaveProperty('generatedAt')
    expect(Array.isArray(json.pilots)).toBe(true)
    // At least the shape — there's a pilot
    if (json.pilots.length > 0) {
      expect(json.pilots[0]).toHaveProperty('agentId')
      expect(json.pilots[0]).toHaveProperty('email')
      expect(json.pilots[0]).toHaveProperty('sessionsLast7d')
      expect(json.pilots[0]).toHaveProperty('inactiveHours')
    }  })
})
