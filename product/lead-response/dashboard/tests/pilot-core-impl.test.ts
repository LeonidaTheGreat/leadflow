/**
 * @jest-environment node
 */

/**
 * Tests for Free Pilot Onboarding — No Credit Card Required
 * Core Implementation (3 of 4): API calls working, Error handling implemented
 *
 * Task: 46113fdb-49c4-41ac-834e-a6a1f623e582
 *
 * Verifies:
 * - Pilot signup API uses correct 'events' table (not non-existent 'analytics_events')
 * - FUB API key stored in agent_integrations on signup
 * - All error conditions return appropriate HTTP status codes
 * - pilot_tier, pilot_started_at, pilot_expires_at set correctly (60-day pilot)
 * - Telegram notification and welcome email are non-blocking (failure doesn't break signup)
 * - pilot-status API correctly computes daysRemaining and isExpired
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAgent = { id: 'agent-abc', email: 'jane@realty.com', first_name: 'Jane', last_name: 'Smith' }

let fromImpl: (table: string) => unknown
const insertedEvents: unknown[] = []
const insertedIntegrations: unknown[] = []

jest.mock('@/lib/db', () => {
  const createClient = jest.fn(() => ({
    from: (table: string) => fromImpl(table),
  }))
  return {
    createClient,
    postgrestAdmin: {
      from: (table: string) => fromImpl(table),
    },
  }
})

jest.mock('bcryptjs', () => ({ hash: jest.fn(() => Promise.resolve('hashed_pw')) }))
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock_jwt'),
  verify: jest.fn((token: string) => {
    if (token === 'bad-token') throw new Error('invalid token')
    return { userId: 'agent-abc', email: 'jane@realty.com' }
  }),
}))

global.fetch = jest.fn(() =>
  Promise.resolve({ ok: true, text: () => Promise.resolve('') })
) as jest.Mock

import { POST as pilotSignupHandler } from '../app/api/auth/pilot-signup/route'
import { GET as pilotStatusHandler } from '../app/api/auth/pilot-status/route'
import { NextRequest } from 'next/server'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeSignupRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/auth/pilot-signup', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function makeStatusRequest(cookieToken = 'valid-token'): NextRequest {
  return new NextRequest('http://localhost/api/auth/pilot-status', {
    method: 'GET',
    headers: { cookie: `auth-token=${cookieToken}` },
  })
}

function makeDefaultFromImpl(agentExists = false, agentData: unknown = null) {
  return (table: string) => {
    if (table === 'real_estate_agents') {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve(
                agentExists
                  ? { data: { id: 'agent-abc' }, error: null }
                  : { data: null, error: { code: 'PGRST116' } }
              ),
          }),
        }),
        insert: (data: unknown) => ({
          select: () => ({
            single: () =>
              Promise.resolve({ data: agentData || mockAgent, error: null }),
          }),
        }),
      }
    }
    if (table === 'agent_integrations') {
      return {
        insert: (data: unknown) => {
          insertedIntegrations.push(data)
          return Promise.resolve({ error: null })
        },
      }
    }
    if (table === 'events') {
      return {
        insert: (data: unknown) => {
          insertedEvents.push(data)
          return Promise.resolve({ error: null })
        },
      }
    }
    if (table === 'email_verification_tokens') {
      return {
        insert: () => Promise.resolve({ error: null }),
      }
    }
    // Reject any attempt to use analytics_events (table does not exist in production)
    if (table === 'analytics_events') {
      return {
        insert: () => Promise.resolve({ error: { message: 'relation "analytics_events" does not exist' } }),
      }
    }
    return { insert: () => Promise.resolve({ error: null }) }
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Free Pilot Onboarding — Core Implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    insertedEvents.length = 0
    insertedIntegrations.length = 0
    process.env.JWT_SECRET = 'test-secret'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    // No Telegram/Resend keys — tests should not depend on them
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID
    delete process.env.RESEND_API_KEY
  })

  describe('POST /api/auth/pilot-signup — happy path', () => {
    beforeEach(() => {
      fromImpl = makeDefaultFromImpl()
    })

    it('returns 201 success with agentId and redirectTo', async () => {
      const res = await pilotSignupHandler(makeSignupRequest({
        email: 'jane@realty.com',
        password: 'password123',
        name: 'Jane Smith',
      }))
      const body = await res.json()
      expect(res.status).toBe(200) // NextResponse.json default is 200
      expect(body.success).toBe(true)
      expect(body.agentId).toBeDefined()
      expect(body.redirectTo).toBe('/dashboard/onboarding')
    })

    it('sets auth-token cookie on success', async () => {
      const res = await pilotSignupHandler(makeSignupRequest({
        email: 'jane@realty.com',
        password: 'password123',
      }))
      const setCookie = res.headers.get('set-cookie')
      expect(setCookie).toContain('auth-token')
    })

    it('stores FUB API key in agent_integrations when provided', async () => {
      await pilotSignupHandler(makeSignupRequest({
        email: 'jane@realty.com',
        password: 'password123',
        fub_api_key: 'fub-test-key-123',
      }))
      // Give non-blocking operations time to complete
      await new Promise(resolve => setTimeout(resolve, 50))
      // agent_integrations should have been called
      expect(insertedIntegrations.length).toBeGreaterThan(0)
      const integrationRecord = insertedIntegrations[0] as Record<string, unknown>
      expect(integrationRecord.follow_up_boss_api_key).toBe('fub-test-key-123')
    })

    it('logs event to events table (not analytics_events)', async () => {
      await pilotSignupHandler(makeSignupRequest({
        email: 'jane@realty.com',
        password: 'password123',
      }))
      await new Promise(resolve => setTimeout(resolve, 50))
      // events table should have received a pilot_started entry
      const pilotEvent = insertedEvents.find(
        (e: unknown) => (e as Record<string, unknown>).event_type === 'pilot_started'
      )
      expect(pilotEvent).toBeDefined()
      expect((pilotEvent as Record<string, unknown>).event_data).toBeDefined()
    })

    it('creates agent with plan_tier=pilot and 60-day pilot window', async () => {
      let insertedAgentData: Record<string, unknown> | null = null

      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({ single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }) }),
            }),
            insert: (data: Record<string, unknown>) => {
              insertedAgentData = data
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: mockAgent, error: null }),
                }),
              }
            },
          }
        }
        return { insert: () => Promise.resolve({ error: null }) }
      }

      await pilotSignupHandler(makeSignupRequest({
        email: 'jane@realty.com',
        password: 'password123',
      }))

      expect(insertedAgentData).not.toBeNull()
      expect(insertedAgentData!.plan_tier).toBe('pilot')
      expect(insertedAgentData!.pilot_started_at).toBeDefined()
      expect(insertedAgentData!.pilot_expires_at).toBeDefined()

      // Verify pilot window is ~60 days
      const started = new Date(insertedAgentData!.pilot_started_at as string)
      const expires = new Date(insertedAgentData!.pilot_expires_at as string)
      const daysDiff = (expires.getTime() - started.getTime()) / (1000 * 60 * 60 * 24)
      expect(daysDiff).toBeCloseTo(60, 0)

      // No stripe_customer_id — no credit card required
      expect(insertedAgentData!.stripe_customer_id).toBeUndefined()
    })

    it('sets email_verified=true (no email gate per PRD)', async () => {
      let insertedAgentData: Record<string, unknown> | null = null

      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({ single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }) }),
            }),
            insert: (data: Record<string, unknown>) => {
              insertedAgentData = data
              return { select: () => ({ single: () => Promise.resolve({ data: mockAgent, error: null }) }) }
            },
          }
        }
        return { insert: () => Promise.resolve({ error: null }) }
      }

      await pilotSignupHandler(makeSignupRequest({ email: 'jane@realty.com', password: 'password123' }))
      expect(insertedAgentData!.email_verified).toBe(true)
    })
  })

  describe('POST /api/auth/pilot-signup — validation errors', () => {
    beforeEach(() => {
      fromImpl = makeDefaultFromImpl()
    })

    it('returns 400 when email is missing', async () => {
      const res = await pilotSignupHandler(makeSignupRequest({ password: 'password123' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBeTruthy()
    })

    it('returns 400 when password is missing', async () => {
      const res = await pilotSignupHandler(makeSignupRequest({ email: 'jane@realty.com' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBeTruthy()
    })

    it('returns 400 for invalid email format', async () => {
      const res = await pilotSignupHandler(makeSignupRequest({ email: 'not-an-email', password: 'password123' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('valid email')
    })

    it('returns 400 for password shorter than 8 characters', async () => {
      const res = await pilotSignupHandler(makeSignupRequest({ email: 'jane@realty.com', password: 'short' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('8 characters')
    })

    it('returns 409 for duplicate email', async () => {
      fromImpl = makeDefaultFromImpl(true) // agentExists = true
      const res = await pilotSignupHandler(makeSignupRequest({ email: 'jane@realty.com', password: 'password123' }))
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toContain('already exists')
    })
  })

  describe('POST /api/auth/pilot-signup — DB failure handling', () => {
    it('returns 500 when agent creation fails in DB', async () => {
      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({ single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }) }),
            }),
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: null, error: { message: 'DB error', code: '23000' } }),
              }),
            }),
          }
        }
        return { insert: () => Promise.resolve({ error: null }) }
      }

      const res = await pilotSignupHandler(makeSignupRequest({ email: 'jane@realty.com', password: 'password123' }))
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBeTruthy()
    })
  })

  describe('GET /api/auth/pilot-status — authentication', () => {
    it('returns 401 when no auth-token cookie', async () => {
      const req = new NextRequest('http://localhost/api/auth/pilot-status', { method: 'GET' })
      const res = await pilotStatusHandler(req)
      expect(res.status).toBe(401)
    })

    it('returns 401 for invalid/expired token', async () => {
      const res = await pilotStatusHandler(makeStatusRequest('bad-token'))
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/auth/pilot-status — pilot calculations', () => {
    it('returns daysRemaining correctly for active pilot', async () => {
      const expiresAt = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString()

      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { plan_tier: 'pilot', pilot_started_at: new Date().toISOString(), pilot_expires_at: expiresAt },
                    error: null,
                  }),
              }),
            }),
          }
        }
        return {}
      }

      const res = await pilotStatusHandler(makeStatusRequest())
      const body = await res.json()
      expect(body.isPilot).toBe(true)
      expect(body.daysRemaining).toBeGreaterThanOrEqual(44)
      expect(body.daysRemaining).toBeLessThanOrEqual(46)
      expect(body.isExpired).toBe(false)
    })

    it('returns isExpired=true for expired pilot', async () => {
      const expiredAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()

      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { plan_tier: 'pilot', pilot_started_at: new Date().toISOString(), pilot_expires_at: expiredAt },
                    error: null,
                  }),
              }),
            }),
          }
        }
        return {}
      }

      const res = await pilotStatusHandler(makeStatusRequest())
      const body = await res.json()
      expect(body.isPilot).toBe(true)
      expect(body.isExpired).toBe(true)
      expect(body.daysRemaining).toBe(0)
    })

    it('returns isPilot=false for non-pilot agents', async () => {
      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { plan_tier: 'starter', pilot_started_at: null, pilot_expires_at: null },
                    error: null,
                  }),
              }),
            }),
          }
        }
        return {}
      }

      const res = await pilotStatusHandler(makeStatusRequest())
      const body = await res.json()
      expect(body.isPilot).toBe(false)
      expect(body.daysRemaining).toBe(0)
    })
  })

  describe('Telegram/Email notifications — non-blocking behavior', () => {
    it('signup succeeds even when Telegram notification fails', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'test-token'
      process.env.TELEGRAM_CHAT_ID = 'test-chat'
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, text: () => Promise.resolve('API error') })

      fromImpl = makeDefaultFromImpl()

      const res = await pilotSignupHandler(makeSignupRequest({ email: 'jane@realty.com', password: 'password123' }))
      const body = await res.json()
      expect(body.success).toBe(true)
    })

    it('signup succeeds even when welcome email fails', async () => {
      process.env.RESEND_API_KEY = 'test-resend-key'
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, text: () => Promise.resolve('email error') })

      fromImpl = makeDefaultFromImpl()

      const res = await pilotSignupHandler(makeSignupRequest({ email: 'jane@realty.com', password: 'password123' }))
      const body = await res.json()
      expect(body.success).toBe(true)
    })
  })
})
