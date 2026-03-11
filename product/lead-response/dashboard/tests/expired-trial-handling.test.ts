/**
 * @jest-environment node
 */

/**
 * Tests for Expired Trial Handling (AC-8)
 * 
 * Expired trial handling not implemented (AC-8)
 * Task: 6e69ba9b-9ab8-4a4e-9146-87451e00c4b3
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock Supabase
let fromImpl: (table: string) => any

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => fromImpl(table),
  })),
}))

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock_jwt_token'),
  verify: jest.fn(() => ({ userId: 'agent-123', email: 'test@example.com' })),
}))

import { POST as expireTrialsHandler } from '../app/api/cron/expire-trials/route'
import { GET as trialStatusHandler } from '../app/api/trial/status/route'
import { NextRequest } from 'next/server'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTrialStatusRequest(cookies: Record<string, string> = { 'auth-token': 'valid-token' }): NextRequest {
  return new NextRequest('http://localhost/api/trial/status', {
    method: 'GET',
    headers: {
      cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
    },
  })
}

function makeExpireTrialsRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader) {
    headers['authorization'] = authHeader
  }
  return new NextRequest('http://localhost/api/cron/expire-trials', {
    method: 'POST',
    headers,
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Expired Trial Handling (AC-8)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.CRON_SECRET = 'test-cron-secret'
  })

  describe('GET /api/trial/status', () => {
    it('AC-8.1: Returns isTrial=false for non-trial agents', async () => {
      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { plan_tier: 'pro', trial_ends_at: null },
                  error: null,
                }),
              }),
            }),
          }
        }
        return { insert: () => Promise.resolve({ error: null }) }
      }

      const request = makeTrialStatusRequest()
      const response = await trialStatusHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isTrial).toBe(false)
      expect(data.isExpired).toBe(false)
      expect(data.daysRemaining).toBe(0)
    })

    it('AC-8.2: Returns isExpired=true when trial_ends_at is in the past', async () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { plan_tier: 'trial', trial_ends_at: pastDate },
                  error: null,
                }),
              }),
            }),
          }
        }
        return { insert: () => Promise.resolve({ error: null }) }
      }

      const request = makeTrialStatusRequest()
      const response = await trialStatusHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isTrial).toBe(true)
      expect(data.isExpired).toBe(true)
      expect(data.daysRemaining).toBe(0)
    })

    it('AC-8.3: Returns isExpired=false for active trials', async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { plan_tier: 'trial', trial_ends_at: futureDate },
                  error: null,
                }),
              }),
            }),
          }
        }
        return { insert: () => Promise.resolve({ error: null }) }
      }

      const request = makeTrialStatusRequest()
      const response = await trialStatusHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isTrial).toBe(true)
      expect(data.isExpired).toBe(false)
      expect(data.daysRemaining).toBeGreaterThan(0)
    })

    it('AC-8.4: Calculates days remaining correctly', async () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { plan_tier: 'trial', trial_ends_at: futureDate },
                  error: null,
                }),
              }),
            }),
          }
        }
        return { insert: () => Promise.resolve({ error: null }) }
      }

      const request = makeTrialStatusRequest()
      const response = await trialStatusHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.daysRemaining).toBe(5)
    })

    it('AC-8.5: Returns 401 when not authenticated', async () => {
      const request = makeTrialStatusRequest({}) // No auth token
      const response = await trialStatusHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })
  })

  describe('POST /api/cron/expire-trials', () => {
    it('AC-8.6: Returns 401 without valid cron secret', async () => {
      const request = makeExpireTrialsRequest('Bearer wrong-secret')
      const response = await expireTrialsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('AC-8.7: Processes expired trials with valid cron secret', async () => {
      let eventsInserted = false
      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({
                lt: () => Promise.resolve({
                  data: [{ id: 'agent-1' }, { id: 'agent-2' }],
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'events') {
          return {
            insert: () => {
              eventsInserted = true
              return Promise.resolve({ error: null })
            },
          }
        }
        return { insert: () => Promise.resolve({ error: null }) }
      }

      const request = makeExpireTrialsRequest('Bearer test-cron-secret')
      const response = await expireTrialsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(2)
      expect(eventsInserted).toBe(true)
    })

    it('AC-8.8: Returns success when no expired trials found', async () => {
      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({
                lt: () => Promise.resolve({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }
        }
        return { insert: () => Promise.resolve({ error: null }) }
      }

      const request = makeExpireTrialsRequest('Bearer test-cron-secret')
      const response = await expireTrialsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(0)
      expect(data.message).toBe('No expired trials found')
    })

    it('AC-8.9: Works without CRON_SECRET set (backward compatibility)', async () => {
      delete process.env.CRON_SECRET
      
      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({
                lt: () => Promise.resolve({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }
        }
        return { insert: () => Promise.resolve({ error: null }) }
      }

      const request = makeExpireTrialsRequest() // No auth header
      const response = await expireTrialsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Trial status edge cases', () => {
    it('AC-8.10: Handles agent not found gracefully', async () => {
      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          }
        }
        return { insert: () => Promise.resolve({ error: null }) }
      }

      const request = makeTrialStatusRequest()
      const response = await trialStatusHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isTrial).toBe(false)
      expect(data.isExpired).toBe(false)
    })

    it('AC-8.11: Handles database errors gracefully', async () => {
      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: null,
                  error: { message: 'Database connection failed' },
                }),
              }),
            }),
          }
        }
        return { insert: () => Promise.resolve({ error: null }) }
      }

      const request = makeTrialStatusRequest()
      const response = await trialStatusHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isTrial).toBe(false)
      expect(data.isExpired).toBe(false)
    })
  })

  describe('Leads preservation', () => {
    it('AC-8.12: Does not delete leads when trial expires', async () => {
      // Leads are never deleted - only SMS sending is paused
      // This is verified by checking no DELETE operations are performed
      const deleteOperations: string[] = []
      
      fromImpl = (table: string) => {
        return {
          select: () => ({
            eq: () => ({
              lt: () => Promise.resolve({ data: [], error: null }),
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
          delete: () => {
            deleteOperations.push(table)
            return Promise.resolve({ error: null })
          },
          insert: () => Promise.resolve({ error: null }),
        }
      }

      const request = makeExpireTrialsRequest('Bearer test-cron-secret')
      await expireTrialsHandler(request)

      // No delete operations should be performed
      expect(deleteOperations).toHaveLength(0)
    })

    it('AC-8.13: Logs trial_expired events for tracking', async () => {
      let loggedEventType: string | null = null
      
      fromImpl = (table: string) => {
        if (table === 'real_estate_agents') {
          return {
            select: () => ({
              eq: () => ({
                lt: () => Promise.resolve({
                  data: [{ id: 'agent-1' }],
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'events') {
          return {
            insert: (events: any[]) => {
              if (events && events.length > 0) {
                loggedEventType = events[0].event_type
              }
              return Promise.resolve({ error: null })
            },
          }
        }
        return { insert: () => Promise.resolve({ error: null }) }
      }

      const request = makeExpireTrialsRequest('Bearer test-cron-secret')
      await expireTrialsHandler(request)

      expect(loggedEventType).toBe('trial_expired')
    })
  })
})
