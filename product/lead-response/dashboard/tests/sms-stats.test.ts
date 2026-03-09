/**
 * @jest-environment node
 */

/**
 * Tests for /api/analytics/sms-stats endpoint
 *
 * Bug fix: route was querying 'messages' table which lacks agent_id.
 * Correct table: sms_messages (has id, direction, status, agent_id, lead_id, message_body)
 * Direction values: 'outbound-api' / 'inbound' (Twilio canonical values)
 * Opt-out detection: message_body column (not 'body')
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSession = { id: 'sess-1', userId: 'agent-123' }

jest.mock('@/lib/session', () => ({
  validateSession: jest.fn(),
}))

// We'll swap implementations per test using this ref
let fromImpl: (table: string) => any

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => fromImpl(table),
  },
}))

import { validateSession } from '@/lib/session'
import { GET } from '../app/api/analytics/sms-stats/route'
import { NextRequest } from 'next/server'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(
  params: Record<string, string> = {},
  cookies: Record<string, string> = { leadflow_session: 'valid-token' }
): NextRequest {
  const url = new URL('http://localhost/api/analytics/sms-stats')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const req = new NextRequest(url.toString(), {
    method: 'GET',
    headers: {
      cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
    },
  })
  return req
}

/** Build a simple chainable Supabase mock that resolves with the given value */
function mockChain(resolveValue: { data: any; error: any }) {
  const chain: any = {}
  chain.select = jest.fn(() => chain)
  chain.eq = jest.fn(() => chain)
  chain.gte = jest.fn(() => chain)
  chain.in = jest.fn(() => chain)
  chain.then = jest.fn((cb: any) => Promise.resolve(cb(resolveValue)))
  return chain
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/analytics/sms-stats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(validateSession as jest.Mock).mockResolvedValue(mockSession)
  })

  // ── Auth ──────────────────────────────────────────────────────────────────

  describe('Authentication', () => {
    it('returns 401 when no session cookie is present', async () => {
      const req = makeRequest({}, {})
      const res = await GET(req)
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 when session token is invalid', async () => {
      ;(validateSession as jest.Mock).mockResolvedValue(null)
      const req = makeRequest()
      const res = await GET(req)
      expect(res.status).toBe(401)
    })
  })

  // ── Correct table usage ───────────────────────────────────────────────────

  describe('Table selection (bug fix)', () => {
    it('queries sms_messages table — NOT the messages table', async () => {
      const queriedTables: string[] = []

      fromImpl = (table: string) => {
        queriedTables.push(table)
        return mockChain({ data: [], error: null })
      }

      const req = makeRequest()
      await GET(req)

      expect(queriedTables).not.toContain('messages')
      expect(queriedTables).toContain('sms_messages')
    })

    it('filters outbound direction using outbound-api (Twilio value)', async () => {
      const directionValues: string[] = []

      fromImpl = (_table: string) => {
        const chain: any = {}
        chain.select = jest.fn(() => chain)
        chain.eq = jest.fn((col: string, val: string) => {
          if (col === 'direction') directionValues.push(val)
          return chain
        })
        chain.gte = jest.fn(() => chain)
        chain.in = jest.fn(() => chain)
        chain.then = jest.fn((cb: any) => Promise.resolve(cb({ data: [], error: null })))
        return chain
      }

      const req = makeRequest()
      await GET(req)

      expect(directionValues).toContain('outbound-api')
      expect(directionValues).not.toContain('outbound')
    })

    it('uses message_body column for opt-out detection — NOT body', async () => {
      const outboundData = [{ id: '1', status: 'delivered', lead_id: 'lead-1' }]
      const inboundData = [{ lead_id: 'lead-1', message_body: 'STOP' }]

      // Shared counter so second from('sms_messages') returns inboundData
      let smsCallCount = 0

      fromImpl = (table: string) => {
        const chain: any = {}
        chain.select = jest.fn(() => chain)
        chain.eq = jest.fn(() => chain)
        chain.gte = jest.fn(() => chain)
        chain.in = jest.fn(() => chain)
        if (table === 'sms_messages') {
          chain.then = jest.fn((cb: any) => {
            smsCallCount++
            const data = smsCallCount === 1 ? outboundData : inboundData
            return Promise.resolve(cb({ data, error: null }))
          })
        } else {
          chain.then = jest.fn((cb: any) => Promise.resolve(cb({ data: [], error: null })))
        }
        return chain
      }

      const req = makeRequest()
      const res = await GET(req)
      const body = await res.json()

      // STOP message should be excluded — leadsReplied must be 0
      expect(body.leadsReplied).toBe(0)
      expect(res.status).toBe(200)
    })
  })

  // ── Time window ───────────────────────────────────────────────────────────

  describe('Time window parameter', () => {
    beforeEach(() => {
      fromImpl = (_table: string) => mockChain({ data: [], error: null })
    })

    it('defaults to 30d when no window param', async () => {
      const res = await GET(makeRequest())
      const body = await res.json()
      expect(body.window).toBe('30d')
    })

    it('accepts 7d window', async () => {
      const res = await GET(makeRequest({ window: '7d' }))
      const body = await res.json()
      expect(body.window).toBe('7d')
    })

    it('accepts all window', async () => {
      const res = await GET(makeRequest({ window: 'all' }))
      const body = await res.json()
      expect(body.window).toBe('all')
    })

    it('accepts 30d window', async () => {
      const res = await GET(makeRequest({ window: '30d' }))
      const body = await res.json()
      expect(body.window).toBe('30d')
    })
  })

  // ── Response shape ────────────────────────────────────────────────────────

  describe('Response shape', () => {
    beforeEach(() => {
      fromImpl = (_table: string) => mockChain({ data: [], error: null })
    })

    it('returns 200 with required fields', async () => {
      const res = await GET(makeRequest())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveProperty('window')
      expect(body).toHaveProperty('deliveryRate')
      expect(body).toHaveProperty('replyRate')
      expect(body).toHaveProperty('bookingConversion')
      expect(body).toHaveProperty('messagesSent')
      expect(body).toHaveProperty('leadsReplied')
      expect(body).toHaveProperty('bookingsMade')
    })

    it('returns null rates when no messages sent (not 0%)', async () => {
      const res = await GET(makeRequest())
      const body = await res.json()
      expect(body.messagesSent).toBe(0)
      expect(body.deliveryRate).toBeNull()
      expect(body.replyRate).toBeNull()
    })
  })

  // ── Metric calculations ───────────────────────────────────────────────────

  describe('Metric calculations', () => {
    it('calculates delivery rate correctly', async () => {
      const outboundData = [
        { id: '1', status: 'delivered', lead_id: 'lead-1' },
        { id: '2', status: 'delivered', lead_id: 'lead-2' },
        { id: '3', status: 'failed', lead_id: 'lead-3' },
        { id: '4', status: 'sent', lead_id: 'lead-4' },
      ]

      let smsCallCount = 0
      fromImpl = (table: string) => {
        const chain: any = {}
        chain.select = jest.fn(() => chain)
        chain.eq = jest.fn(() => chain)
        chain.gte = jest.fn(() => chain)
        chain.in = jest.fn(() => chain)
        if (table === 'sms_messages') {
          chain.then = jest.fn((cb: any) => {
            smsCallCount++
            return Promise.resolve(cb({ data: smsCallCount === 1 ? outboundData : [], error: null }))
          })
        } else {
          chain.then = jest.fn((cb: any) => Promise.resolve(cb({ data: [], error: null })))
        }
        return chain
      }

      const res = await GET(makeRequest())
      const body = await res.json()

      expect(body.messagesSent).toBe(4)
      expect(body.deliveryRate).toBeCloseTo(0.5) // 2/4
    })

    it('calculates reply rate excluding opt-outs', async () => {
      const outboundData = [
        { id: '1', status: 'delivered', lead_id: 'lead-1' },
        { id: '2', status: 'delivered', lead_id: 'lead-2' },
      ]
      const inboundData = [
        { lead_id: 'lead-1', message_body: 'Interested!' },
        { lead_id: 'lead-2', message_body: 'STOP' }, // opt-out — excluded
      ]

      let smsCallCount = 0
      fromImpl = (table: string) => {
        const chain: any = {}
        chain.select = jest.fn(() => chain)
        chain.eq = jest.fn(() => chain)
        chain.gte = jest.fn(() => chain)
        chain.in = jest.fn(() => chain)
        if (table === 'sms_messages') {
          chain.then = jest.fn((cb: any) => {
            smsCallCount++
            return Promise.resolve(
              cb({ data: smsCallCount === 1 ? outboundData : inboundData, error: null })
            )
          })
        } else {
          chain.then = jest.fn((cb: any) => Promise.resolve(cb({ data: [], error: null })))
        }
        return chain
      }

      const res = await GET(makeRequest())
      const body = await res.json()

      // 1 real reply / 2 leads messaged = 50%
      expect(body.leadsReplied).toBe(1)
      expect(body.replyRate).toBeCloseTo(0.5)
    })

    it('calculates booking conversion relative to replying leads', async () => {
      const outboundData = [
        { id: '1', status: 'delivered', lead_id: 'lead-1' },
        { id: '2', status: 'delivered', lead_id: 'lead-2' },
      ]
      const inboundData = [
        { lead_id: 'lead-1', message_body: 'Yes interested' },
        { lead_id: 'lead-2', message_body: 'Call me' },
      ]
      const bookingData = [{ lead_id: 'lead-1' }]

      let smsCallCount = 0
      fromImpl = (table: string) => {
        const chain: any = {}
        chain.select = jest.fn(() => chain)
        chain.eq = jest.fn(() => chain)
        chain.gte = jest.fn(() => chain)
        chain.in = jest.fn(() => chain)
        if (table === 'sms_messages') {
          chain.then = jest.fn((cb: any) => {
            smsCallCount++
            return Promise.resolve(
              cb({ data: smsCallCount === 1 ? outboundData : inboundData, error: null })
            )
          })
        } else if (table === 'bookings') {
          chain.then = jest.fn((cb: any) =>
            Promise.resolve(cb({ data: bookingData, error: null }))
          )
        } else {
          chain.then = jest.fn((cb: any) => Promise.resolve(cb({ data: [], error: null })))
        }
        return chain
      }

      const res = await GET(makeRequest())
      const body = await res.json()

      // 1 booked / 2 replied = 50%
      expect(body.bookingsMade).toBe(1)
      expect(body.bookingConversion).toBeCloseTo(0.5)
    })
  })

  // ── Error handling ────────────────────────────────────────────────────────

  describe('Error handling', () => {
    it('returns 500 if sms_messages query fails', async () => {
      fromImpl = (_table: string) =>
        mockChain({ data: null, error: { message: 'relation sms_messages does not exist' } })

      const res = await GET(makeRequest())
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBeDefined()
    })

    it('returns partial data (null bookingConversion) if bookings query fails', async () => {
      const outboundData = [{ id: '1', status: 'delivered', lead_id: 'lead-1' }]
      const inboundData = [{ lead_id: 'lead-1', message_body: 'Yes!' }]

      let smsCallCount = 0
      fromImpl = (table: string) => {
        const chain: any = {}
        chain.select = jest.fn(() => chain)
        chain.eq = jest.fn(() => chain)
        chain.gte = jest.fn(() => chain)
        chain.in = jest.fn(() => chain)
        if (table === 'sms_messages') {
          chain.then = jest.fn((cb: any) => {
            smsCallCount++
            return Promise.resolve(
              cb({ data: smsCallCount === 1 ? outboundData : inboundData, error: null })
            )
          })
        } else if (table === 'bookings') {
          chain.then = jest.fn((cb: any) =>
            Promise.resolve(cb({ data: null, error: { message: 'bookings query failed' } }))
          )
        } else {
          chain.then = jest.fn((cb: any) => Promise.resolve(cb({ data: [], error: null })))
        }
        return chain
      }

      const res = await GET(makeRequest())
      // Should not 500 — booking failure is non-fatal
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.bookingConversion).toBeNull()
    })
  })

  // ── Agent scoping ─────────────────────────────────────────────────────────

  describe('Agent scoping', () => {
    it('scopes all queries to the authenticated agent_id — no cross-agent data', async () => {
      const agentIdValues: string[] = []

      fromImpl = (_table: string) => {
        const chain: any = {}
        chain.select = jest.fn(() => chain)
        chain.eq = jest.fn((col: string, val: string) => {
          if (col === 'agent_id') agentIdValues.push(val)
          return chain
        })
        chain.gte = jest.fn(() => chain)
        chain.in = jest.fn(() => chain)
        chain.then = jest.fn((cb: any) => Promise.resolve(cb({ data: [], error: null })))
        return chain
      }

      await GET(makeRequest())

      expect(agentIdValues.length).toBeGreaterThan(0)
      agentIdValues.forEach((id) => expect(id).toBe('agent-123'))
    })
  })
})
