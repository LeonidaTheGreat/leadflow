/**
 * @jest-environment node
 */
/**
 * QC E2E test — dee7f4da
 * Verify: booking API reads agent_id from session only, never query params
 *
 * Security invariants tested:
 * 1. No session cookie → 401
 * 2. Invalid session token → 401
 * 3. agent_id query param is silently ignored (session agent used instead)
 * 4. Lead belonging to another agent → 403 (cross-agent protection)
 * 5. GET and POST both enforce session auth
 */

const AGENT_A = 'agent-session-owner'
const AGENT_B = 'agent-attacker'
const LEAD_OWN = 'lead-belongs-to-a'
const LEAD_OTHER = 'lead-belongs-to-b'

jest.mock('@/lib/session', () => ({ validateSession: jest.fn() }))
jest.mock('@/lib/supabase', () => ({ getAgentById: jest.fn(), getLeadById: jest.fn() }))
jest.mock('@/lib/calcom', () => ({
  generateBookingLink: jest.fn(() => 'https://cal.com/link'),
  getAgentBookingLink: jest.fn((a: any) => `https://cal.com/${a.calcom_username}`),
}))

import { validateSession } from '@/lib/session'
import { getAgentById, getLeadById } from '@/lib/supabase'
import { GET, POST } from '../app/api/booking/route'
import { NextRequest } from 'next/server'

const mockValidateSession = validateSession as jest.Mock
const mockGetAgentById = getAgentById as jest.Mock
const mockGetLeadById = getLeadById as jest.Mock

function req(method: 'GET' | 'POST', params: Record<string, string> = {}, cookie = 'leadflow_session=tok', body?: any) {
  const url = new URL('http://localhost/api/booking')
  if (method === 'GET') Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), {
    method,
    headers: { cookie, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockValidateSession.mockResolvedValue({ userId: AGENT_A })
  mockGetAgentById.mockResolvedValue({ data: { id: AGENT_A, calcom_username: 'agent-a-cal' } })
  mockGetLeadById.mockResolvedValue({ data: { id: LEAD_OWN, agent_id: AGENT_A } })
})

// ── GET ────────────────────────────────────────────────────────────────────────

describe('GET /api/booking', () => {
  it('401 — missing cookie', async () => {
    const r = await GET(req('GET', {}, ''))
    expect(r.status).toBe(401)
  })

  it('401 — invalid session', async () => {
    mockValidateSession.mockResolvedValue(null)
    const r = await GET(req('GET'))
    expect(r.status).toBe(401)
  })

  it('ignores agent_id query param — uses session agent', async () => {
    // Even if attacker passes a different agent_id in query string, session agent must be used
    const r = await GET(req('GET', { agent_id: AGENT_B }))
    expect(r.status).toBe(200)
    // Must have been called with session agent, not attacker's agent
    expect(mockGetAgentById).toHaveBeenCalledWith(AGENT_A)
    expect(mockGetAgentById).not.toHaveBeenCalledWith(AGENT_B)
  })

  it('403 — lead belongs to different agent', async () => {
    mockGetLeadById.mockResolvedValue({ data: { id: LEAD_OTHER, agent_id: AGENT_B } })
    const r = await GET(req('GET', { lead_id: LEAD_OTHER }))
    expect(r.status).toBe(403)
    const body = await r.json()
    expect(body.error).toBe('Forbidden')
  })

  it('200 — own lead with session auth', async () => {
    const r = await GET(req('GET', { lead_id: LEAD_OWN }))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.success).toBe(true)
    expect(body.booking_link).toBeDefined()
  })
})

// ── POST ───────────────────────────────────────────────────────────────────────

describe('POST /api/booking', () => {
  const validBody = { lead_id: LEAD_OWN, start_time: '2025-06-01T10:00:00Z', end_time: '2025-06-01T11:00:00Z' }

  it('401 — no session cookie', async () => {
    const r = await POST(req('POST', {}, '', validBody))
    expect(r.status).toBe(401)
  })

  it('403 — lead belongs to another agent', async () => {
    mockGetLeadById.mockResolvedValue({ data: { id: LEAD_OTHER, agent_id: AGENT_B } })
    const r = await POST(req('POST', {}, 'leadflow_session=tok', { ...validBody, lead_id: LEAD_OTHER }))
    expect(r.status).toBe(403)
  })

  it('uses session agent, ignores any body agent_id', async () => {
    // Attacker tries to spoof via body field
    const r = await POST(req('POST', {}, 'leadflow_session=tok', { ...validBody, agent_id: AGENT_B }))
    expect(r.status).toBe(200)
    expect(mockGetAgentById).toHaveBeenCalledWith(AGENT_A)
    expect(mockGetAgentById).not.toHaveBeenCalledWith(AGENT_B)
  })

  it('400 — missing start_time', async () => {
    const r = await POST(req('POST', {}, 'leadflow_session=tok', { lead_id: LEAD_OWN }))
    expect(r.status).toBe(400)
  })

  it('200 — valid authenticated booking', async () => {
    const r = await POST(req('POST', {}, 'leadflow_session=tok', validBody))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.success).toBe(true)
    expect(body.agent_id).toBe(AGENT_A)
  })
})
