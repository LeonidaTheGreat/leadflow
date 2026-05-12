/**
 * @jest-environment node
 */
/**
 * Cal.com Connect Route — Auth Tests
 *
 * Verifies that POST /api/integrations/cal-com/connect and
 * DELETE /api/integrations/cal-com/connect require session auth.
 */

const AGENT_ID = 'test-agent-id'

jest.mock('@/lib/services/AuthService', () => ({ auth: jest.fn() }))
jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: jest.fn().mockReturnValue({
      upsert: jest.fn().mockReturnValue(Promise.resolve({ error: null })),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(Promise.resolve({ error: null })),
      }),
    }),
  },
}))

import { auth } from '@/lib/services/AuthService'
import { POST, DELETE } from '../app/api/integrations/cal-com/connect/route'
import { NextRequest } from 'next/server'

const mockAuth = auth as jest.Mock

function makeRequest(method: 'POST' | 'DELETE', body?: object) {
  return new NextRequest('http://localhost/api/integrations/cal-com/connect', {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: AGENT_ID } })
})

describe('POST /api/integrations/cal-com/connect', () => {
  it('401 — no session', async () => {
    mockAuth.mockResolvedValue({ user: null })
    const r = await POST(makeRequest('POST', { calcomLink: 'https://cal.com/user/30min' }))
    expect(r.status).toBe(401)
  })

  it('400 — missing calcomLink', async () => {
    const r = await POST(makeRequest('POST', {}))
    expect(r.status).toBe(400)
  })

  it('400 — invalid cal.com URL', async () => {
    const r = await POST(makeRequest('POST', { calcomLink: 'https://notcalcom.com/user' }))
    expect(r.status).toBe(400)
  })

  it('200 — valid link saves to DB', async () => {
    const r = await POST(makeRequest('POST', { calcomLink: 'https://cal.com/john-doe/30min' }))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.valid).toBe(true)
  })
})

describe('DELETE /api/integrations/cal-com/connect', () => {
  it('401 — no session', async () => {
    mockAuth.mockResolvedValue({ user: null })
    const r = await DELETE(makeRequest('DELETE'))
    expect(r.status).toBe(401)
  })

  it('200 — authenticated disconnect', async () => {
    const r = await DELETE(makeRequest('DELETE'))
    expect(r.status).toBe(200)
  })
})
