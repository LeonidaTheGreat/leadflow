/**
 * @jest-environment node
 *
 * Tests for GET /api/internal/pilot-usage
 * PRD: PRD-SESSION-ANALYTICS-PILOT (FR-4)
 * Task: fix-get-api-internal-pilot-usage-endpoint-does-not-exi (ba32f4e1)
 */
import { NextRequest } from 'next/server'

// ---- Supabase mock setup ----
// We need to mock the chained Supabase query API.
// Each call to .from() returns a fresh mock that we configure per-call.

type MockSelectResult = { data: unknown; error: unknown }

// Callable mock: tracks calls in order so we can respond differently per query
const mockSelectResults: MockSelectResult[] = []
let callIndex = 0

const makeChain = (result: MockSelectResult) => ({
  select: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue(result),
  // order resolves the chain
})

// We need distinct chains per .from() call
const fromMock = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: fromMock,
  })),
}))

// ---- Helpers ----
function makeRequest(overrides: { authHeader?: string | null } = {}): NextRequest {
  const { authHeader = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-service-role-key'}` } = overrides
  const headers: Record<string, string> = {}
  if (authHeader !== null) headers['authorization'] = authHeader
  return new NextRequest('http://localhost/api/internal/pilot-usage', {
    method: 'GET',
    headers,
  })
}

// ---- Test data ----
const MOCK_AGENTS = [
  {
    id: 'agent-1',
    email: 'alice@example.com',
    first_name: 'Alice',
    last_name: 'Smith',
    last_login_at: '2026-03-10T08:00:00.000Z',
  },
  {
    id: 'agent-2',
    email: 'bob@example.com',
    first_name: 'Bob',
    last_name: null,
    last_login_at: null,
  },
]

const MOCK_SESSIONS_7D = [
  { agent_id: 'agent-1', session_start: '2026-03-09T10:00:00.000Z', last_active_at: '2026-03-09T10:30:00.000Z' },
  { agent_id: 'agent-1', session_start: '2026-03-08T09:00:00.000Z', last_active_at: '2026-03-08T09:45:00.000Z' },
]

const MOCK_ALL_SESSIONS = [
  { agent_id: 'agent-1', last_active_at: '2026-03-10T09:00:00.000Z' },
  { agent_id: 'agent-2', last_active_at: '2026-03-07T12:00:00.000Z' },
]

const MOCK_PAGE_VIEWS = [
  { agent_id: 'agent-1', page: '/dashboard' },
  { agent_id: 'agent-1', page: '/dashboard' },
  { agent_id: 'agent-1', page: '/leads' },
  { agent_id: 'agent-2', page: '/settings' },
]

// ---- Tests ----

describe('GET /api/internal/pilot-usage', () => {
  beforeEach(() => {
    jest.resetModules()
    // Set a known service role key for tests
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    callIndex = 0
    fromMock.mockReset()
  })

  function setupFromMock(
    agentsResult: MockSelectResult,
    sessions7dResult: MockSelectResult,
    allSessionsResult: MockSelectResult,
    pageViewsResult: MockSelectResult
  ) {
    // Each .from() call returns a chain; we track by call order
    fromMock
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(agentsResult),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue(sessions7dResult),
        order: jest.fn().mockResolvedValue(sessions7dResult),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(allSessionsResult),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue(pageViewsResult),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(pageViewsResult),
      })
  }

  it('returns 401 when no Authorization header is provided', async () => {
    const { GET } = await import('@/app/api/internal/pilot-usage/route')
    const req = makeRequest({ authHeader: null })
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when Authorization token is wrong', async () => {
    const { GET } = await import('@/app/api/internal/pilot-usage/route')
    const req = makeRequest({ authHeader: 'Bearer wrong-token' })
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when Authorization header does not use Bearer scheme', async () => {
    const { GET } = await import('@/app/api/internal/pilot-usage/route')
    const req = makeRequest({ authHeader: 'Basic test-service-role-key' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 with empty array when no agents exist', async () => {
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })
    const { GET } = await import('@/app/api/internal/pilot-usage/route')
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns 500 when agents query fails', async () => {
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })
    const { GET } = await import('@/app/api/internal/pilot-usage/route')
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(500)
    consoleSpy.mockRestore()
  })

  it('returns correct pilot usage data for authenticated request', async () => {
    // agents query
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: MOCK_AGENTS, error: null }),
    })
    // sessions last 7 days
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({ data: MOCK_SESSIONS_7D, error: null }),
    })
    // all sessions
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: MOCK_ALL_SESSIONS, error: null }),
    })
    // page views
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: MOCK_PAGE_VIEWS, error: null }),
    })

    const { GET } = await import('@/app/api/internal/pilot-usage/route')
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(2)

    const alice = body.find((r: { agentId: string }) => r.agentId === 'agent-1')
    expect(alice).toBeDefined()
    expect(alice.email).toBe('alice@example.com')
    expect(alice.name).toBe('Alice Smith')
    expect(alice.lastLogin).toBe('2026-03-10T08:00:00.000Z')
    expect(alice.sessionsLast7d).toBe(2)
    expect(alice.topPage).toBe('/dashboard') // mode: appears twice
    expect(typeof alice.inactiveHours).toBe('number')

    const bob = body.find((r: { agentId: string }) => r.agentId === 'agent-2')
    expect(bob).toBeDefined()
    expect(bob.name).toBe('Bob') // null last_name handled
    expect(bob.lastLogin).toBeNull()
    expect(bob.sessionsLast7d).toBe(0)
    expect(bob.topPage).toBe('/settings')
    expect(typeof bob.inactiveHours).toBe('number')
  })

  it('gracefully handles session query failures (non-fatal)', async () => {
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: MOCK_AGENTS, error: null }),
    })
    // sessions 7d — error
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({ data: null, error: { message: 'sessions error' } }),
    })
    // all sessions — error
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'all sessions error' } }),
    })
    // page views — error
    fromMock.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: null, error: { message: 'page views error' } }),
    })

    const { GET } = await import('@/app/api/internal/pilot-usage/route')
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const req = makeRequest()
    const res = await GET(req)
    // Still returns 200 with degraded data
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0].sessionsLast7d).toBe(0) // fallback to 0
    expect(body[0].inactiveHours).toBeNull() // fallback to null
    expect(body[0].topPage).toBeNull() // fallback to null
    consoleSpy.mockRestore()
  })
})
