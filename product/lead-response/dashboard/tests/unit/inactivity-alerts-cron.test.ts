/**
 * @jest-environment node
 */

/**
 * Unit tests for FR-5: Inactivity Alerting Cron
 * /api/cron/inactivity-alerts
 *
 * Tests:
 * 1. Returns 401 when authorization header is missing or wrong
 * 2. Returns 503 when CRON_SECRET is not set
 * 3. Returns 503 when database is not configured
 * 4. Returns 200 with no inactive agents found
 * 5. Skips agents already alerted within 24h (dedup via alerted_at)
 * 6. Alerts inactive agents and inserts inactivity_alerts row (alerted_at + channel)
 * 7. Dry-run mode does not send Telegram or insert rows
 * 8. Uses correct schema: last_used_at (not last_active_at), alerted_at for dedup
 */

import { NextRequest } from 'next/server'

// ─── Mock supabase-server ────────────────────────────────────────────────────
const mockFrom = jest.fn()
jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: { from: (...args: any[]) => mockFrom(...args) },
  isSupabaseConfigured: jest.fn(() => true),
}))

// ─── Mock logger ─────────────────────────────────────────────────────────────
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// We need to import after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { GET } = require('@/app/api/cron/inactivity-alerts/route')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { isSupabaseConfigured } = require('@/lib/supabase-server')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(opts: {
  authHeader?: string
  test?: string
} = {}): NextRequest {
  const url = new URL(`http://localhost/api/cron/inactivity-alerts${opts.test ? `?test=${opts.test}` : ''}`)
  const headers = new Headers()
  if (opts.authHeader !== undefined) {
    headers.set('authorization', opts.authHeader)
  }
  return new NextRequest(url, { method: 'GET', headers })
}

/** Build a chainable QueryBuilder mock that resolves with { data, error } */
function makeQueryBuilder(response: { data: any; error: any }) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue(response),
    // Make it thenable so await works
    then: (resolve: any) => Promise.resolve(response).then(resolve),
    catch: (reject: any) => Promise.resolve(response).catch(reject),
  }
  return qb
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/cron/inactivity-alerts', () => {
  const CRON_SECRET = 'test-cron-secret'

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    process.env.ORCHESTRATOR_BOT_TOKEN = 'bot-token'
    process.env.TELEGRAM_CHAT_ID = 'chat-id'
    ;(isSupabaseConfigured as jest.Mock).mockReturnValue(true)
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => '' })
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
    delete process.env.ORCHESTRATOR_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID
  })

  // ── Auth tests ──────────────────────────────────────────────────────────────

  it('returns 503 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const req = makeRequest({ authHeader: 'Bearer anything' })
    const res = await GET(req)
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toMatch(/CRON_SECRET/i)
  })

  it('returns 401 when authorization header is missing', async () => {
    const req = makeRequest({}) // no authHeader
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when authorization header is wrong', async () => {
    const req = makeRequest({ authHeader: 'Bearer wrong-secret' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 503 when database is not configured', async () => {
    ;(isSupabaseConfigured as jest.Mock).mockReturnValue(false)
    const req = makeRequest({ authHeader: `Bearer ${CRON_SECRET}` })
    const res = await GET(req)
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toMatch(/not configured/i)
  })

  // ── No inactive agents ──────────────────────────────────────────────────────

  it('returns success with zero counts when no inactive sessions found', async () => {
    const noResults = makeQueryBuilder({ data: [], error: null })
    mockFrom.mockReturnValue(noResults)

    const req = makeRequest({ authHeader: `Bearer ${CRON_SECRET}` })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.checked).toBe(0)
    expect(body.alerted).toBe(0)
    expect(body.skipped).toBe(0)
  })

  it('returns success when agent_sessions query returns null', async () => {
    const nullResults = makeQueryBuilder({ data: null, error: null })
    mockFrom.mockReturnValue(nullResults)

    const req = makeRequest({ authHeader: `Bearer ${CRON_SECRET}` })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.checked).toBe(0)
  })

  // ── Deduplication ───────────────────────────────────────────────────────────

  it('skips agents already alerted within 24h (dedup via alerted_at)', async () => {
    const agentId = 'agent-uuid-1'
    const inactiveSession = { agent_id: agentId, last_used_at: '2026-01-01T00:00:00Z' }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'agent_sessions') {
        return makeQueryBuilder({ data: [inactiveSession], error: null })
      }
      if (table === 'inactivity_alerts') {
        // Recent alert exists — should skip
        return makeQueryBuilder({
          data: [{ id: 'alert-1', alerted_at: new Date().toISOString() }],
          error: null,
        })
      }
      return makeQueryBuilder({ data: [], error: null })
    })

    const req = makeRequest({ authHeader: `Bearer ${CRON_SECRET}` })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.skipped).toBe(1)
    expect(body.alerted).toBe(0)
    expect(body.results[0].reason).toBe('already_alerted_within_24h')
  })

  // ── Alerting ────────────────────────────────────────────────────────────────

  it('alerts inactive agent, sends Telegram, and inserts row with alerted_at + channel', async () => {
    const agentId = 'agent-uuid-2'
    const agentEmail = 'pilot@test.com'
    const inactiveSession = { agent_id: agentId, last_used_at: '2026-01-01T00:00:00Z' }
    const agentDetails = { email: agentEmail, first_name: 'John', last_name: 'Doe' }

    const insertMock = jest.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'agent_sessions') {
        return makeQueryBuilder({ data: [inactiveSession], error: null })
      }
      if (table === 'inactivity_alerts') {
        const qb = makeQueryBuilder({ data: [], error: null })
        qb.insert = insertMock
        return qb
      }
      if (table === 'real_estate_agents') {
        return makeQueryBuilder({ data: [agentDetails], error: null })
      }
      return makeQueryBuilder({ data: [], error: null })
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => '' })

    const req = makeRequest({ authHeader: `Bearer ${CRON_SECRET}` })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alerted).toBe(1)
    expect(body.skipped).toBe(0)

    // Verify Telegram was called
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.telegram.org'),
      expect.objectContaining({ method: 'POST' })
    )

    // Verify insert used correct schema: agent_id, alert_type, message, resolved, alerted_at, channel
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: agentId,
        alert_type: 'inactivity_72h',
        message: expect.any(String),
        resolved: false,
        alerted_at: expect.any(String),
        channel: 'telegram',
      })
    )
  })

  it('uses last_used_at (not last_active_at) when querying agent_sessions', async () => {
    mockFrom.mockReturnValue(makeQueryBuilder({ data: [], error: null }))

    const req = makeRequest({ authHeader: `Bearer ${CRON_SECRET}` })
    await GET(req)

    // Verify agent_sessions was queried and lt() used last_used_at
    expect(mockFrom).toHaveBeenCalledWith('agent_sessions')
    const sessionsQb = mockFrom.mock.results[0].value
    expect(sessionsQb.select).toHaveBeenCalledWith('agent_id, last_used_at')
    expect(sessionsQb.lt).toHaveBeenCalledWith('last_used_at', expect.any(String))
  })

  it('uses alerted_at (not created_at) for dedup window query', async () => {
    const agentId = 'agent-uuid-5'
    const inactiveSession = { agent_id: agentId, last_used_at: '2026-01-01T00:00:00Z' }

    const alertsQb = makeQueryBuilder({ data: [], error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'agent_sessions') {
        return makeQueryBuilder({ data: [inactiveSession], error: null })
      }
      if (table === 'inactivity_alerts') {
        return alertsQb
      }
      return makeQueryBuilder({ data: [], error: null })
    })

    const req = makeRequest({ authHeader: `Bearer ${CRON_SECRET}` })
    await GET(req)

    // The dedup query on inactivity_alerts should use gte('alerted_at', ...)
    expect(alertsQb.gte).toHaveBeenCalledWith('alerted_at', expect.any(String))
    // And NOT use created_at
    expect(alertsQb.gte).not.toHaveBeenCalledWith('created_at', expect.anything())
  })

  // ── Dry-run ─────────────────────────────────────────────────────────────────

  it('dry-run mode does not send Telegram or insert rows', async () => {
    const agentId = 'agent-uuid-3'
    const inactiveSession = { agent_id: agentId, last_used_at: '2026-01-01T00:00:00Z' }
    const agentDetails = { email: 'pilot@test.com', first_name: 'Jane', last_name: 'Smith' }

    const insertMock = jest.fn()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'agent_sessions') {
        return makeQueryBuilder({ data: [inactiveSession], error: null })
      }
      if (table === 'inactivity_alerts') {
        const qb = makeQueryBuilder({ data: [], error: null })
        qb.insert = insertMock
        return qb
      }
      if (table === 'real_estate_agents') {
        return makeQueryBuilder({ data: [agentDetails], error: null })
      }
      return makeQueryBuilder({ data: [], error: null })
    })

    const req = makeRequest({ authHeader: `Bearer ${CRON_SECRET}`, test: 'true' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.dry_run).toBe(true)

    // Telegram NOT called
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('api.telegram.org'),
      expect.anything()
    )
    // Insert NOT called
    expect(insertMock).not.toHaveBeenCalled()

    // Result should show dry_run action
    const result = body.results.find((r: any) => r.agent_id === agentId)
    expect(result?.action).toBe('dry_run')
  })

  // ── Error handling ──────────────────────────────────────────────────────────

  it('returns 500 when agent_sessions query fails', async () => {
    mockFrom.mockReturnValue(
      makeQueryBuilder({ data: null, error: { message: 'DB error' } })
    )

    const req = makeRequest({ authHeader: `Bearer ${CRON_SECRET}` })
    const res = await GET(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to fetch inactive sessions')
  })

  it('skips agent and counts as skipped when dedup check errors', async () => {
    const agentId = 'agent-uuid-4'
    const inactiveSession = { agent_id: agentId, last_used_at: '2026-01-01T00:00:00Z' }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'agent_sessions') {
        return makeQueryBuilder({ data: [inactiveSession], error: null })
      }
      if (table === 'inactivity_alerts') {
        return makeQueryBuilder({ data: null, error: { message: 'dedup query failed' } })
      }
      return makeQueryBuilder({ data: [], error: null })
    })

    const req = makeRequest({ authHeader: `Bearer ${CRON_SECRET}` })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.skipped).toBe(1)
    expect(body.alerted).toBe(0)

    const result = body.results[0]
    expect(result.reason).toBe('dedup_check_failed')
  })

  // ── Schedule verification ───────────────────────────────────────────────────

  it('vercel.json has inactivity-alerts scheduled every 30 minutes', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vercelJson = require('../../vercel.json')
    const cronEntry = vercelJson.crons.find(
      (c: { path: string; schedule: string }) => c.path === '/api/cron/inactivity-alerts'
    )
    expect(cronEntry).toBeDefined()
    expect(cronEntry.schedule).toBe('*/30 * * * *')
  })
})
