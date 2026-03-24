/**
 * @jest-environment node
 *
 * Tests for the inactivity alerting cron (FR-5)
 * Route: GET /api/cron/inactivity-alerts
 *
 * FR-5: cron fires every 30 minutes, checks for pilots inactive >72h
 * via agent_sessions.last_active_at, de-duplicates via inactivity_alerts,
 * sends Telegram notification.
 */

import { NextRequest } from 'next/server'

// ---- Supabase mock ----
// mockFrom must be declared before jest.mock() because babel-jest hoists
// jest.mock calls above imports but not above variable declarations.

const mockFrom = jest.fn()

jest.mock('@/lib/supabase-server', () => ({
  // Use arrow wrapper so mockFrom is accessed at call-time (not hoist-time)
  supabaseServer: { from: (...args: any[]) => mockFrom(...args) },
  isSupabaseConfigured: jest.fn().mockReturnValue(true),
}))

// ---- Telegram (fetch) mock ----
const mockFetch = jest.fn()
global.fetch = mockFetch

// ---- Import route AFTER mocks ----
import { GET } from '@/app/api/cron/inactivity-alerts/route'

// ---- Test data ----
const AGENT_ID = 'agent-uuid-111'
const INACTIVE_SESSION = {
  agent_id: AGENT_ID,
  last_active_at: new Date(Date.now() - 80 * 60 * 60 * 1000).toISOString(), // 80h ago
  real_estate_agents: {
    id: AGENT_ID,
    email: 'pilot@example.com',
    first_name: 'Jane',
    last_name: 'Pilot',
  },
}

// ---- Helpers ----
function makeRequest(opts: { authHeader?: string; test?: string } = {}): NextRequest {
  const url = new URL('http://localhost/api/cron/inactivity-alerts')
  if (opts.test) url.searchParams.set('test', opts.test)
  return new NextRequest(url.toString(), {
    method: 'GET',
    headers: opts.authHeader ? { authorization: opts.authHeader } : {},
  })
}

/** Build a chainable Supabase query mock that resolves to `result`. */
function buildChain(result: unknown): any {
  const chain: any = {}
  const methods = ['select', 'lt', 'order', 'gte', 'limit', 'eq', 'insert']
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain)
  })
  chain.then = (resolve: any) => Promise.resolve(result).then(resolve)
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-bot-token'
  process.env.TELEGRAM_CHAT_ID = '-1001234567890'

  mockFetch.mockResolvedValue({ ok: true, text: async () => 'ok' })
})

afterEach(() => {
  delete process.env.CRON_SECRET
  delete process.env.TELEGRAM_BOT_TOKEN
  delete process.env.TELEGRAM_CHAT_ID
})

// ── Auth ────────────────────────────────────────────────────────────────────

describe('auth', () => {
  it('returns 401 when CRON_SECRET set and header is missing', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when CRON_SECRET set and header is wrong', async () => {
    const res = await GET(makeRequest({ authHeader: 'Bearer wrong' }))
    expect(res.status).toBe(401)
  })

  it('allows request with correct Bearer token', async () => {
    mockFrom.mockReturnValue(buildChain({ data: [], error: null }))
    const res = await GET(makeRequest({ authHeader: 'Bearer test-secret' }))
    expect(res.status).toBe(200)
  })
})

// ── No inactive agents ───────────────────────────────────────────────────────

describe('no inactive agents', () => {
  beforeEach(() => {
    mockFrom.mockReturnValue(buildChain({ data: [], error: null }))
  })

  it('returns success with 0 checked when no sessions are inactive', async () => {
    const res = await GET(makeRequest({ authHeader: 'Bearer test-secret' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.checked).toBe(0)
    expect(body.alerted).toBe(0)
  })
})

// ── Alert sent for new inactive agent ────────────────────────────────────────

describe('inactive agent — first alert', () => {
  beforeEach(() => {
    let call = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'agent_sessions') {
        return buildChain({ data: [INACTIVE_SESSION], error: null })
      }
      if (table === 'inactivity_alerts') {
        call++
        if (call === 1) {
          // dedup check — no existing alert
          return buildChain({ data: [], error: null })
        }
        // insert call
        return buildChain({ data: null, error: null })
      }
      return buildChain({ data: null, error: null })
    })
  })

  it('sends Telegram and returns alerted=1', async () => {
    const res = await GET(makeRequest({ authHeader: 'Bearer test-secret' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alerted).toBe(1)
    expect(body.skipped).toBe(0)
    expect(body.results[0].action).toBe('alerted')
    expect(body.results[0].email).toBe('pilot@example.com')
  })

  it('calls the Telegram API with correct URL', async () => {
    await GET(makeRequest({ authHeader: 'Bearer test-secret' }))
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.telegram.org'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})

// ── Deduplication ─────────────────────────────────────────────────────────────

describe('deduplication — alert already sent within 24h', () => {
  beforeEach(() => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'agent_sessions') {
        return buildChain({ data: [INACTIVE_SESSION], error: null })
      }
      if (table === 'inactivity_alerts') {
        // dedup check — existing alert within 24h
        return buildChain({
          data: [{ id: 'existing', alerted_at: new Date().toISOString() }],
          error: null,
        })
      }
      return buildChain({ data: null, error: null })
    })
  })

  it('skips alert and does not call Telegram', async () => {
    const res = await GET(makeRequest({ authHeader: 'Bearer test-secret' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alerted).toBe(0)
    expect(body.skipped).toBe(1)
    expect(body.results[0].action).toBe('skipped')
    expect(body.results[0].reason).toBe('already_alerted_within_24h')
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ── Dry-run mode ──────────────────────────────────────────────────────────────

describe('dry-run mode', () => {
  beforeEach(() => {
    let call = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'agent_sessions') {
        return buildChain({ data: [INACTIVE_SESSION], error: null })
      }
      if (table === 'inactivity_alerts') {
        call++
        if (call === 1) return buildChain({ data: [], error: null })
        return buildChain({ data: null, error: null })
      }
      return buildChain({ data: null, error: null })
    })
  })

  it('reports dry_run=true and does not call Telegram', async () => {
    const res = await GET(makeRequest({ authHeader: 'Bearer test-secret', test: 'true' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.dry_run).toBe(true)
    expect(body.results[0].action).toBe('dry_run')
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ── Error handling ─────────────────────────────────────────────────────────────

describe('error handling', () => {
  it('returns 500 when agent_sessions query fails', async () => {
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: 'DB error', code: '500' } })
    )
    const res = await GET(makeRequest({ authHeader: 'Bearer test-secret' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('skips agent and marks reason=dedup_check_failed when dedup query errors', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'agent_sessions') {
        return buildChain({ data: [INACTIVE_SESSION], error: null })
      }
      if (table === 'inactivity_alerts') {
        return buildChain({ data: null, error: { message: 'Table missing', code: '42P01' } })
      }
      return buildChain({ data: null, error: null })
    })

    const res = await GET(makeRequest({ authHeader: 'Bearer test-secret' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alerted).toBe(0)
    expect(body.skipped).toBe(1)
    expect(body.results[0].reason).toBe('dedup_check_failed')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('still counts as alerted when Telegram returns non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, text: async () => 'Unauthorized' })

    let call = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'agent_sessions') {
        return buildChain({ data: [INACTIVE_SESSION], error: null })
      }
      if (table === 'inactivity_alerts') {
        call++
        if (call === 1) return buildChain({ data: [], error: null })
        return buildChain({ data: null, error: null })
      }
      return buildChain({ data: null, error: null })
    })

    const res = await GET(makeRequest({ authHeader: 'Bearer test-secret' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    // Alert row inserted regardless of Telegram failure
    expect(body.alerted).toBe(1)
  })
})
