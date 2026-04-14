/**
 * @jest-environment node
 */

jest.mock('@/lib/services/AuthService', () => ({
  getAuthUserId: jest.fn(),
}))

let fromImpl: (table: string) => any

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => fromImpl(table),
  },
}))

import { NextRequest } from 'next/server'
import { getAuthUserId } from '@/lib/services/AuthService'
import { GET } from '../app/api/metrics/roi/route'

function makeRequest(cookies: Record<string, string> = { leadflow_session: 'valid-token' }): NextRequest {
  return new NextRequest('http://localhost/api/metrics/roi', {
    method: 'GET',
    headers: {
      cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
    },
  })
}

describe('GET /api/metrics/roi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthUserId as jest.Mock).mockResolvedValue('agent-123')
  })

  it('returns 401 when unauthenticated', async () => {
    ;(getAuthUserId as jest.Mock).mockResolvedValue(null)
    const res = await GET(makeRequest({}))
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ error: 'Unauthorized' })
  })

  it('queries messages table and uses direction=outbound for response time', async () => {
    const queriedTables: string[] = []
    const messageEqCalls: Array<[string, unknown]> = []
    let bookingQueryCount = 0

    fromImpl = (table: string) => {
      queriedTables.push(table)
      const chain: any = {}
      chain.select = jest.fn(() => chain)
      chain.eq = jest.fn((column: string, value: unknown) => {
        if (table === 'messages') {
          messageEqCalls.push([column, value])
        }
        return chain
      })
      chain.in = jest.fn(() => chain)
      chain.order = jest.fn(() => chain)
      chain.gte = jest.fn(() => chain)
      chain.lte = jest.fn(() => chain)
      chain.then = jest.fn((cb: any) => {
        if (table === 'leads') {
          return Promise.resolve(cb({
            data: [{ id: 'lead-1', created_at: '2026-04-01T10:00:00.000Z' }],
            error: null,
          }))
        }
        if (table === 'messages') {
          return Promise.resolve(cb({
            data: [{ lead_id: 'lead-1', created_at: '2026-04-01T10:00:30.000Z' }],
            error: null,
          }))
        }
        if (table === 'bookings') {
          bookingQueryCount++
          return Promise.resolve(cb({ data: [], error: null }))
        }
        return Promise.resolve(cb({ data: [], error: null }))
      })
      return chain
    }

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.avgResponseTimeSeconds).toBe(30)
    expect(body.leadsResponded).toBe(1)
    expect(bookingQueryCount).toBe(2)

    expect(queriedTables).toContain('messages')
    expect(queriedTables).not.toContain('sms_messages')
    expect(messageEqCalls).toContainEqual(['direction', 'outbound'])
  })
})
