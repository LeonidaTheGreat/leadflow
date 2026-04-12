/**
 * Tests for POST /api/test-lead
 * @jest-environment node
 */

import { POST } from '@/app/api/test-lead/route'
import { NextRequest } from 'next/server'

// Mock AuthService
jest.mock('@/lib/services/AuthService', () => ({
  getAuthUserId: jest.fn(),
}))

// Mock supabaseAdmin
jest.mock('@/lib/db', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}))

// Mock global fetch
global.fetch = jest.fn()

import { getAuthUserId } from '@/lib/services/AuthService'
import { supabaseAdmin } from '@/lib/db'

const mockGetAuthUserId = getAuthUserId as jest.Mock
const mockFetch = global.fetch as jest.Mock

function makeDb(agentData: object | null, dbError?: object | null) {
  const singleFn = jest.fn().mockResolvedValue({ data: agentData, error: dbError ?? null })
  const selectFn = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: singleFn }) })
  const fromFn = jest.fn().mockReturnValue({ select: selectFn })
  ;(supabaseAdmin as any).from = fromFn
  return { fromFn, selectFn }
}

function createRequest(body: object): NextRequest {
  return {
    json: async () => body,
    cookies: { get: () => undefined },
    headers: { get: () => null },
  } as unknown as NextRequest
}

describe('POST /api/test-lead', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://leadflow-ai-five.vercel.app'
    process.env.FUB_WEBHOOK_SECRET = undefined as any
  })

  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuthUserId.mockResolvedValue(null)

      const res = await POST(createRequest({ phoneNumber: '+14165551234' }))
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })
  })

  describe('input validation', () => {
    beforeEach(() => {
      mockGetAuthUserId.mockResolvedValue('agent-123')
      makeDb({ id: 'agent-123', email: 'test@example.com' })
    })

    it('returns 400 for invalid JSON body', async () => {
      const badRequest = {
        json: async () => { throw new Error('bad json') },
        cookies: { get: () => undefined },
        headers: { get: () => null },
      } as unknown as NextRequest

      const res = await POST(badRequest)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('Invalid JSON body')
    })

    it('returns 400 when phoneNumber is missing', async () => {
      const res = await POST(createRequest({}))
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('phoneNumber is required')
    })

    it('returns 400 when phoneNumber is empty string', async () => {
      const res = await POST(createRequest({ phoneNumber: '   ' }))
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('phoneNumber is required')
    })

    it('returns 400 for phone number without + prefix', async () => {
      const res = await POST(createRequest({ phoneNumber: '14165551234' }))
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toMatch(/E.164/)
    })

    it('returns 400 for phone number with letters', async () => {
      const res = await POST(createRequest({ phoneNumber: '+1416abc5234' }))
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toMatch(/E.164/)
    })
  })

  describe('agent lookup', () => {
    it('returns 404 when agent is not found in database', async () => {
      mockGetAuthUserId.mockResolvedValue('agent-missing')
      makeDb(null)

      const res = await POST(createRequest({ phoneNumber: '+14165551234' }))
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toBe('Agent not found')
    })
  })

  describe('webhook forwarding', () => {
    beforeEach(() => {
      mockGetAuthUserId.mockResolvedValue('agent-123')
      makeDb({ id: 'agent-123', email: 'agent@example.com' })
    })

    it('returns success when webhook returns 200', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      const res = await POST(createRequest({ phoneNumber: '+14165551234' }))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Test lead sent — you should receive an SMS shortly')
    })

    it('forwards request to the correct webhook URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      await POST(createRequest({ phoneNumber: '+14165551234' }))

      expect(mockFetch).toHaveBeenCalledWith(
        'https://leadflow-ai-five.vercel.app/api/webhook/fub',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: expect.stringContaining('+14165551234'),
        })
      )
    })

    it('payload contains the provided phone number', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      await POST(createRequest({ phoneNumber: '+12125559876' }))

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.data.phoneNumber).toBe('+12125559876')
      expect(body.data.phones[0].value).toBe('+12125559876')
      expect(body.event).toBe('peopleCreated')
    })

    it('adds HMAC signature header when FUB_WEBHOOK_SECRET is set', async () => {
      process.env.FUB_WEBHOOK_SECRET = 'test-secret'
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      await POST(createRequest({ phoneNumber: '+14165551234' }))

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['x-signature']).toBeDefined()
      expect(typeof options.headers['x-signature']).toBe('string')
      expect(options.headers['x-signature'].length).toBe(64) // SHA-256 hex = 64 chars
    })

    it('omits x-signature when FUB_WEBHOOK_SECRET is not set', async () => {
      delete process.env.FUB_WEBHOOK_SECRET
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      await POST(createRequest({ phoneNumber: '+14165551234' }))

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['x-signature']).toBeUndefined()
    })

    it('returns 502 when webhook returns non-200', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
        text: async () => 'Internal server error',
      })

      const res = await POST(createRequest({ phoneNumber: '+14165551234' }))
      const data = await res.json()

      expect(res.status).toBe(502)
      expect(data.error).toContain('500')
    })

    it('returns 502 when fetch throws a network error', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))

      const res = await POST(createRequest({ phoneNumber: '+14165551234' }))
      const data = await res.json()

      expect(res.status).toBe(502)
      expect(data.error).toContain('webhook')
    })

    it('trims whitespace from phoneNumber before sending', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      await POST(createRequest({ phoneNumber: '  +14165551234  ' }))

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.data.phoneNumber).toBe('+14165551234')
    })
  })
})
