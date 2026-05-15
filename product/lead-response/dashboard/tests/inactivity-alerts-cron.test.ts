/**
 * @jest-environment node
 */
// Tests for FR-5: Inactivity Alerting Cron (/api/cron/inactivity-alerts)

const mockSupabase = {
  from: jest.fn(),
}

jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: mockSupabase,
  isSupabaseConfigured: jest.fn(() => true),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock fetch for Telegram
global.fetch = jest.fn()

import { NextRequest } from 'next/server'

// Helpers to build mock Supabase chains
function buildChain(resolveWith: unknown) {
  const chain: Record<string, jest.Mock> = {}
  const methods = ['select', 'eq', 'lt', 'gte', 'order', 'limit', 'insert']
  methods.forEach((m) => {
    chain[m] = jest.fn(() => chain)
  })
  // The last awaited call resolves
  chain.limit = jest.fn().mockResolvedValue(resolveWith)
  chain.order = jest.fn().mockResolvedValue(resolveWith)
  chain.insert = jest.fn().mockResolvedValue({ error: null })
  return chain
}

function makeRequest(secret = 'test-secret', params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/cron/inactivity-alerts')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url, {
    headers: { authorization: `Bearer ${secret}` },
  })
}

describe('FR-5: /api/cron/inactivity-alerts', () => {
  let GET: (req: NextRequest) => Promise<Response>

  beforeAll(async () => {
    process.env.CRON_SECRET = 'test-secret'
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token'
    process.env.TELEGRAM_CHAT_ID = '-12345'
    ;({ GET } = await import('@/app/api/cron/inactivity-alerts/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })
  })

  it('returns 401 when authorization header is missing', async () => {
    const req = new NextRequest(new URL('http://localhost/api/cron/inactivity-alerts'))
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when authorization header has wrong secret', async () => {
    const req = makeRequest('wrong-secret')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns success with 0 alerted when no inactive sessions found', async () => {
    const chain = buildChain({ data: [], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.alerted).toBe(0)
  })

  it('skips agents that already received an alert within 24h (dedup)', async () => {
    const inactiveSessions = [
      {
        agent_id: 'agent-1',
        last_active_at: new Date(Date.now() - 80 * 3600 * 1000).toISOString(),
        real_estate_agents: { id: 'agent-1', email: 'a@b.com', first_name: 'A', last_name: 'B' },
      },
    ]

    let callCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'agent_sessions') {
        const chain = buildChain({ data: inactiveSessions, error: null })
        chain.order = jest.fn().mockResolvedValue({ data: inactiveSessions, error: null })
        return chain
      }
      if (table === 'inactivity_alerts') {
        // Simulate recent alert exists → skip
        const chain = buildChain({ data: [{ id: 'alert-1', alerted_at: new Date().toISOString() }], error: null })
        return chain
      }
      return buildChain({ data: null, error: null })
    })

    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.alerted).toBe(0)
    expect(body.skipped).toBe(1)
  })

  it('sends Telegram alert and inserts record for newly inactive agent', async () => {
    const inactiveSessions = [
      {
        agent_id: 'agent-2',
        last_active_at: new Date(Date.now() - 80 * 3600 * 1000).toISOString(),
        real_estate_agents: { id: 'agent-2', email: 'x@y.com', first_name: 'X', last_name: 'Y' },
      },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'agent_sessions') {
        const chain = buildChain({ data: inactiveSessions, error: null })
        chain.order = jest.fn().mockResolvedValue({ data: inactiveSessions, error: null })
        return chain
      }
      if (table === 'inactivity_alerts') {
        const chain = buildChain({ data: [], error: null })
        chain.insert = jest.fn().mockResolvedValue({ error: null })
        return chain
      }
      return buildChain({ data: null, error: null })
    })

    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.alerted).toBe(1)
    // Telegram was called
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.telegram.org'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('does not send Telegram or insert in dry-run mode', async () => {
    const inactiveSessions = [
      {
        agent_id: 'agent-3',
        last_active_at: new Date(Date.now() - 80 * 3600 * 1000).toISOString(),
        real_estate_agents: { id: 'agent-3', email: 'z@z.com', first_name: 'Z', last_name: 'Z' },
      },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'agent_sessions') {
        const chain = buildChain({ data: inactiveSessions, error: null })
        chain.order = jest.fn().mockResolvedValue({ data: inactiveSessions, error: null })
        return chain
      }
      if (table === 'inactivity_alerts') {
        return buildChain({ data: [], error: null })
      }
      return buildChain({ data: null, error: null })
    })

    const res = await GET(makeRequest('test-secret', { test: 'true' }))
    const body = await res.json()
    expect(body.dry_run).toBe(true)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
