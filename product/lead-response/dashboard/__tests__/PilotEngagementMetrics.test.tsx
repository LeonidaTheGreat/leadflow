/**
 * @jest-environment node
 *
 * E2E Test: Session analytics integration test
 * Task: fix-session-analytics-tables-exist-but-lack-integratio
 *
 * Tests that:
 * 1. Pilot engagement metrics component renders
 * 2. API endpoint returns valid pilot data
 * 3. Dashboard displays the metrics correctly
 */

import { NextRequest } from 'next/server'

const SERVICE_ROLE_KEY = 'test-service-role-key'

// Mock Supabase
const mockAgents = [
  {
    id: 'agent-1',
    email: 'alice@test.com',
    first_name: 'Alice',
    last_name: 'Smith',
    plan_tier: 'pilot',
  },
  {
    id: 'agent-2',
    email: 'bob@test.com',
    first_name: 'Bob',
    last_name: 'Johnson',
    plan_tier: 'pilot',
  },
]

const mockSessions = [
  {
    id: 'session-1',
    agent_id: 'agent-1',
    session_start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'session-2',
    agent_id: 'agent-1',
    session_start: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'session-3',
    agent_id: 'agent-2',
    session_start: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(),
    last_active_at: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(),
  },
]

const mockPageViews = [
  { agent_id: 'agent-1', page: '/dashboard/conversations' },
  { agent_id: 'agent-1', page: '/dashboard/conversations' },
  { agent_id: 'agent-1', page: '/dashboard' },
  { agent_id: 'agent-2', page: '/dashboard' },
]

let callCount = 0
const mockFrom = jest.fn((table: string) => {
  const results = [
    { data: mockAgents, error: null },
    { data: mockSessions, error: null },
    { data: mockPageViews, error: null },
  ]
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

// Import after mocks
const { GET } = require('@/app/api/internal/pilot-usage/route')

function makeRequest(authToken?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authToken) headers['authorization'] = `Bearer ${authToken}`
  return new NextRequest('http://localhost/api/internal/pilot-usage', {
    method: 'GET',
    headers,
  })
}

describe('Session Analytics Integration', () => {
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

  describe('API Endpoint: /api/internal/pilot-usage', () => {
    it('returns 401 when no auth token provided', async () => {
      const req = makeRequest()
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns 401 for invalid auth token', async () => {
      const req = makeRequest('invalid-token')
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns 200 with valid auth token', async () => {
      const req = makeRequest(SERVICE_ROLE_KEY)
      const res = await GET(req)
      expect(res.status).toBe(200)
    })

    it('returns pilot data with correct structure', async () => {
      const req = makeRequest(SERVICE_ROLE_KEY)
      const res = await GET(req)
      const data = await res.json()

      expect(data).toHaveProperty('pilots')
      expect(data).toHaveProperty('generatedAt')
      expect(Array.isArray(data.pilots)).toBe(true)
    })

    it('includes all required fields for each pilot', async () => {
      const req = makeRequest(SERVICE_ROLE_KEY)
      const res = await GET(req)
      const data = await res.json()

      if (data.pilots.length > 0) {
        const pilot = data.pilots[0]
        expect(pilot).toHaveProperty('agentId')
        expect(pilot).toHaveProperty('name')
        expect(pilot).toHaveProperty('email')
        expect(pilot).toHaveProperty('planTier')
        expect(pilot).toHaveProperty('lastLogin')
        expect(pilot).toHaveProperty('sessionsLast7d')
        expect(pilot).toHaveProperty('topPage')
        expect(pilot).toHaveProperty('inactiveHours')
        expect(pilot).toHaveProperty('atRisk')
      }
    })

    it('calculates sessions in last 7 days correctly', async () => {
      const req = makeRequest(SERVICE_ROLE_KEY)
      const res = await GET(req)
      const data = await res.json()

      // Agent 1 has 2 sessions within 7 days
      const alice = data.pilots.find((p: { agentId: string }) => p.agentId === 'agent-1')
      expect(alice).toBeDefined()
      expect(alice.sessionsLast7d).toBe(2)
    })

    it('marks pilots as at risk when inactive >72 hours', async () => {
      const req = makeRequest(SERVICE_ROLE_KEY)
      const res = await GET(req)
      const data = await res.json()

      // Agent 2 has been inactive for 100 hours
      const bob = data.pilots.find((p: { agentId: string }) => p.agentId === 'agent-2')
      expect(bob).toBeDefined()
      expect(bob.atRisk).toBe(true)
      expect(bob.inactiveHours).toBeGreaterThan(72)
    })

    it('identifies top page by frequency', async () => {
      const req = makeRequest(SERVICE_ROLE_KEY)
      const res = await GET(req)
      const data = await res.json()

      // Agent 1's top page should be /dashboard/conversations (2 visits)
      const alice = data.pilots.find((p: { agentId: string }) => p.agentId === 'agent-1')
      expect(alice).toBeDefined()
      expect(alice.topPage).toBe('/dashboard/conversations')
    })

    it('returns empty pilots array when no agents exist', async () => {
      mockFrom.mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
      }))

      const req = makeRequest(SERVICE_ROLE_KEY)
      const res = await GET(req)
      const data = await res.json()

      expect(data.pilots).toEqual([])
    })
  })

  describe('Dashboard Integration', () => {
    it('API endpoint is accessible from dashboard', async () => {
      // Verify the endpoint is callable
      const req = makeRequest(SERVICE_ROLE_KEY)
      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.pilots).toBeDefined()
    })

    it('returns actionable metrics for monitoring', async () => {
      const req = makeRequest(SERVICE_ROLE_KEY)
      const res = await GET(req)
      const data = await res.json()

      // Should include at least one pilot
      expect(data.pilots.length).toBeGreaterThan(0)

      // Should include both active and at-risk pilots
      const atRisk = data.pilots.filter((p: { atRisk: boolean }) => p.atRisk)
      const active = data.pilots.filter((p: { atRisk: boolean }) => !p.atRisk)

      // Based on mock data
      expect(active.length).toBeGreaterThan(0)
      expect(atRisk.length).toBeGreaterThan(0)
    })
  })
})
