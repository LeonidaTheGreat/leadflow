/**
 * @jest-environment node
 */

/**
 * Tests for Pilot Signup API
 * 
 * Free Pilot Onboarding — No Credit Card Required
 * Task: dd12e2f5-da84-412e-919b-9406d2c296f6
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAgent = { id: 'agent-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe' }

// Mock Supabase
let fromImpl: (table: string) => any

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => fromImpl(table),
  })),
}))

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hashed_password')),
}))

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock_jwt_token'),
  verify: jest.fn(() => ({ userId: 'agent-123', email: 'test@example.com' })),
}))

// Mock fetch for Telegram and email
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve(''),
  })
) as jest.Mock

import { POST as pilotSignupHandler } from '../app/api/auth/pilot-signup/route'
import { GET as pilotStatusHandler } from '../app/api/auth/pilot-status/route'
import { NextRequest } from 'next/server'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSignupRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/auth/pilot-signup', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function makeStatusRequest(cookies: Record<string, string> = { 'auth-token': 'valid-token' }): NextRequest {
  return new NextRequest('http://localhost/api/auth/pilot-status', {
    method: 'GET',
    headers: {
      cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
    },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Pilot Signup API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret'
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token'
    process.env.TELEGRAM_CHAT_ID = 'test-chat-id'
    process.env.RESEND_API_KEY = 'test-resend-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  describe('POST /api/auth/pilot-signup', () => {
    it('should create a pilot agent with correct fields', async () => {
      let insertData: any = null

      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
            insert: (data: any) => {
              insertData = data
              return {
                select: () => ({
                  single: () => Promise.resolve({
                    data: mockAgent,
                    error: null,
                  }),
                }),
              }
            },
          }
        }
        return {
          insert: () => Promise.resolve({ error: null }),
        }
      }

      const request = makeSignupRequest({
        email: 'test@example.com',
        password: 'password123',
        name: 'John Doe',
        brokerage_name: 'Test Brokerage',
      })

      const response = await pilotSignupHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.redirectTo).toBe('/dashboard/onboarding')
      
      // Verify the insert was called with pilot-specific fields
      expect(insertData).toBeDefined()
      expect(insertData.plan_tier).toBe('pilot')
      expect(insertData.pilot_started_at).toBeDefined()
      expect(insertData.pilot_expires_at).toBeDefined()
      expect(insertData.source).toBe('pilot_signup')
      expect(insertData.mrr).toBe(0)
    })

    it('should reject duplicate emails', async () => {
      fromImpl = () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { id: 'existing-id' },
              error: null,
            }),
          }),
        }),
      })

      const request = makeSignupRequest({
        email: 'existing@example.com',
        password: 'password123',
      })

      const response = await pilotSignupHandler(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already exists')
    })

    it('should validate email format', async () => {
      const request = makeSignupRequest({
        email: 'invalid-email',
        password: 'password123',
      })

      const response = await pilotSignupHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('valid email')
    })

    it('should validate password length', async () => {
      const request = makeSignupRequest({
        email: 'test@example.com',
        password: 'short',
      })

      const response = await pilotSignupHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('8 characters')
    })

    it('should require email and password', async () => {
      const request = makeSignupRequest({
        email: '',
        password: '',
      })

      const response = await pilotSignupHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })
  })

  describe('GET /api/auth/pilot-status', () => {
    it('should return pilot status for authenticated pilot user', async () => {
      fromImpl = () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: {
                plan_tier: 'pilot',
                pilot_started_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                pilot_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              },
              error: null,
            }),
          }),
        }),
      })

      const request = makeStatusRequest()

      const response = await pilotStatusHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isPilot).toBe(true)
      expect(data.daysRemaining).toBeGreaterThan(0)
      expect(data.isExpired).toBe(false)
    })

    it('should return expired status for expired pilot', async () => {
      fromImpl = () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: {
                plan_tier: 'pilot',
                pilot_started_at: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
                pilot_expires_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
              },
              error: null,
            }),
          }),
        }),
      })

      const request = makeStatusRequest()

      const response = await pilotStatusHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isPilot).toBe(true)
      expect(data.isExpired).toBe(true)
      expect(data.daysRemaining).toBe(0)
    })

    it('should return non-pilot status for paid users', async () => {
      fromImpl = () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: {
                plan_tier: 'pro',
                pilot_started_at: null,
                pilot_expires_at: null,
              },
              error: null,
            }),
          }),
        }),
      })

      const request = makeStatusRequest()

      const response = await pilotStatusHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isPilot).toBe(false)
    })

    it('should reject unauthenticated requests', async () => {
      const request = makeStatusRequest({})

      const response = await pilotStatusHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Not authenticated')
    })
  })
})
