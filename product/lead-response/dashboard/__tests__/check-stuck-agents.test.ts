/**
 * @jest-environment node
 *
 * Unit tests for GET /api/cron/check-stuck-agents
 *
 * Verifies:
 * 1. CRON_SECRET auth guard rejects unauthorized requests
 * 2. checkAndAlertStuckAgents() is called with the correct db client
 * 3. The route is registered in vercel.json with a valid schedule
 */

import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

// ---- onboarding-telemetry mock ----
// Declared before jest.mock() due to babel-jest hoisting behaviour.
// Arrow wrapper captures the reference, not the value — safe across hoisting.
const mockCheckAndAlertStuckAgents = jest.fn()

jest.mock('@/lib/onboarding-telemetry', () => ({
  checkAndAlertStuckAgents: (...args: any[]) => mockCheckAndAlertStuckAgents(...args),
  createStuckAlerts: jest.fn(),
}))

// ---- db mock ----
jest.mock('@/lib/db', () => ({
  postgrestAdmin: { from: jest.fn() },
  isPostgrestConfigured: jest.fn().mockReturnValue(true),
}))

// ---- Import route AFTER mocks ----
import { GET } from '@/app/api/cron/check-stuck-agents/route'

// ---- Helpers ----
function makeRequest(opts: { authHeader?: string; secret?: string } = {}): NextRequest {
  const url = new URL('http://localhost/api/cron/check-stuck-agents')
  if (opts.secret) url.searchParams.set('secret', opts.secret)
  return new NextRequest(url.toString(), {
    method: 'GET',
    headers: opts.authHeader ? { authorization: opts.authHeader } : {},
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.CRON_SECRET = 'test-cron-secret'
})

afterEach(() => {
  delete process.env.CRON_SECRET
})

// ── Auth ────────────────────────────────────────────────────────────────────

describe('auth', () => {
  it('returns 500 when CRON_SECRET env var is not configured', async () => {
    delete process.env.CRON_SECRET
    const res = await GET(makeRequest({ authHeader: 'Bearer any-token' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/CRON_SECRET not configured/)
  })

  it('returns 401 when no auth credentials provided', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/Unauthorized/)
  })

  it('returns 401 when wrong Bearer token provided', async () => {
    const res = await GET(makeRequest({ authHeader: 'Bearer wrong-secret' }))
    expect(res.status).toBe(401)
  })

  it('returns 401 when wrong query secret provided', async () => {
    const res = await GET(makeRequest({ secret: 'wrong-secret' }))
    expect(res.status).toBe(401)
  })

  it('accepts valid Bearer token', async () => {
    mockCheckAndAlertStuckAgents.mockResolvedValue({ success: true, alerts_created: 0, alerts: [] })
    const res = await GET(makeRequest({ authHeader: 'Bearer test-cron-secret' }))
    expect(res.status).toBe(200)
  })

  it('accepts valid ?secret= query parameter', async () => {
    mockCheckAndAlertStuckAgents.mockResolvedValue({ success: true, alerts_created: 0, alerts: [] })
    const res = await GET(makeRequest({ secret: 'test-cron-secret' }))
    expect(res.status).toBe(200)
  })
})

// ── createStuckAlerts wiring ─────────────────────────────────────────────────

describe('createStuckAlerts wiring', () => {
  it('calls checkAndAlertStuckAgents with the postgrestAdmin db client', async () => {
    const { postgrestAdmin } = jest.requireMock('@/lib/db')
    mockCheckAndAlertStuckAgents.mockResolvedValue({ success: true, alerts_created: 0, alerts: [] })
    await GET(makeRequest({ authHeader: 'Bearer test-cron-secret' }))
    expect(mockCheckAndAlertStuckAgents).toHaveBeenCalledTimes(1)
    expect(mockCheckAndAlertStuckAgents).toHaveBeenCalledWith(postgrestAdmin)
  })

  it('returns alerts_created count on success', async () => {
    mockCheckAndAlertStuckAgents.mockResolvedValue({ success: true, alerts_created: 3, alerts: [{}, {}, {}] })
    const res = await GET(makeRequest({ authHeader: 'Bearer test-cron-secret' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.alerts_created).toBe(3)
  })

  it('returns 500 when checkAndAlertStuckAgents fails', async () => {
    mockCheckAndAlertStuckAgents.mockResolvedValue({ success: false, error: 'DB connection failed' })
    const res = await GET(makeRequest({ authHeader: 'Bearer test-cron-secret' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('DB connection failed')
  })

  it('returns 500 on unexpected exception from checkAndAlertStuckAgents', async () => {
    mockCheckAndAlertStuckAgents.mockRejectedValue(new Error('Unexpected crash'))
    const res = await GET(makeRequest({ authHeader: 'Bearer test-cron-secret' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
  })
})

// ── Schedule verification ────────────────────────────────────────────────────

describe('cron schedule', () => {
  it('is registered in vercel.json with a daily schedule', () => {
    const vercelPath = path.join(__dirname, '../vercel.json')
    const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'))
    const entry = vercelConfig.crons?.find((c: any) => c.path === '/api/cron/check-stuck-agents')
    expect(entry).toBeDefined()
    expect(entry?.schedule).toMatch(/^\d+ \d+ \* \* \*$/)
  })
})
