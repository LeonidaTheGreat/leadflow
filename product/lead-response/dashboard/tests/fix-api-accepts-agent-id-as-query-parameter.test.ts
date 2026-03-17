/**
 * @jest-environment node
 */

/**
 * Tests for the security fix: booking API must not accept agent_id as a query parameter.
 *
 * Bug: /api/booking?agent_id=<uuid> allowed callers to access any agent's data.
 * Fix: agent_id is now read exclusively from the authenticated session (session cookie).
 *      The agent_id query parameter is rejected / ignored.
 *      The lead must belong to the authenticated agent (cross-agent access returns 403).
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const AGENT_ID = 'agent-abc-123'
const OTHER_AGENT_ID = 'agent-xyz-456'
const LEAD_ID = 'lead-001'

const mockAgent = {
  id: AGENT_ID,
  calcom_username: 'test-agent',
  email: 'agent@example.com',
}

const mockOtherAgent = {
  id: OTHER_AGENT_ID,
  calcom_username: 'other-agent',
  email: 'other@example.com',
}

const mockLead = {
  id: LEAD_ID,
  agent_id: AGENT_ID,
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+15550001234',
}

const mockLeadOtherAgent = {
  id: 'lead-002',
  agent_id: OTHER_AGENT_ID,
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+15559999999',
}

jest.mock('@/lib/session', () => ({
  validateSession: jest.fn(),
}))

jest.mock('@/lib/supabase', () => ({
  getAgentById: jest.fn(),
  getLeadById: jest.fn(),
}))

jest.mock('@/lib/calcom', () => ({
  generateBookingLink: jest.fn(({ agentUsername }: any) => `https://cal.com/${agentUsername}`),
  getAgentBookingLink: jest.fn((agent: any) => `https://cal.com/${agent.calcom_username}`),
}))

import { validateSession } from '@/lib/session'
import { getAgentById, getLeadById } from '@/lib/supabase'
import { GET, POST } from '../app/api/booking/route'
import { NextRequest } from 'next/server'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGetRequest(
  params: Record<string, string> = {},
  cookies: Record<string, string> = { leadflow_session: 'valid-token' }
): NextRequest {
  const url = new URL('http://localhost/api/booking')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), {
    method: 'GET',
    headers: {
      cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
    },
  })
}

function makePostRequest(
  body: Record<string, any>,
  cookies: Record<string, string> = { leadflow_session: 'valid-token' }
): NextRequest {
  return new NextRequest('http://localhost/api/booking', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
    },
    body: JSON.stringify(body),
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/booking — security: agent_id from session only', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(validateSession as jest.Mock).mockResolvedValue({ id: 'sess-1', userId: AGENT_ID })
    ;(getAgentById as jest.Mock).mockResolvedValue({ data: mockAgent })
    ;(getLeadById as jest.Mock).mockResolvedValue({ data: mockLead })
  })

  // ── Authentication ─────────────────────────────────────────────────────────

  describe('Authentication', () => {
    it('returns 401 when no session cookie is present', async () => {
      const req = makeGetRequest({}, {})
      const res = await GET(req)
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 when session token is invalid', async () => {
      ;(validateSession as jest.Mock).mockResolvedValue(null)
      const req = makeGetRequest()
      const res = await GET(req)
      expect(res.status).toBe(401)
    })
  })

  // ── Agent ID scoping ───────────────────────────────────────────────────────

  describe('Agent ID from session (not query params)', () => {
    it('uses agent_id from session, ignores any agent_id query param', async () => {
      // Simulate attacker trying to access a different agent's data via query param
      const req = makeGetRequest({ agent_id: OTHER_AGENT_ID })
      const res = await GET(req)

      expect(res.status).toBe(200)
      // getAgentById should have been called with the SESSION agent, not the query param
      expect(getAgentById).toHaveBeenCalledWith(AGENT_ID)
      expect(getAgentById).not.toHaveBeenCalledWith(OTHER_AGENT_ID)
    })

    it('returns booking link for the authenticated agent (from session)', async () => {
      const req = makeGetRequest()
      const res = await GET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.booking_link).toContain('test-agent')
      expect(body.agent_username).toBe('test-agent')
    })
  })

  // ── Cross-agent protection ─────────────────────────────────────────────────

  describe('Cross-agent protection', () => {
    it("returns 403 when lead belongs to a different agent (not the session agent)", async () => {
      ;(getLeadById as jest.Mock).mockResolvedValue({ data: mockLeadOtherAgent })

      const req = makeGetRequest({ lead_id: mockLeadOtherAgent.id })
      const res = await GET(req)
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toBe('Forbidden')
    })

    it("allows access when lead belongs to the session agent", async () => {
      const req = makeGetRequest({ lead_id: LEAD_ID })
      const res = await GET(req)
      expect(res.status).toBe(200)
    })
  })

  // ── Normal operation ───────────────────────────────────────────────────────

  describe('Normal operation', () => {
    it('returns 400 when agent has no Cal.com configured', async () => {
      ;(getAgentById as jest.Mock).mockResolvedValue({
        data: { ...mockAgent, calcom_username: null },
      })
      const req = makeGetRequest()
      const res = await GET(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('Cal.com')
    })

    it('returns 404 when lead is not found', async () => {
      ;(getLeadById as jest.Mock).mockResolvedValue({ data: null })
      const req = makeGetRequest({ lead_id: 'nonexistent-lead' })
      const res = await GET(req)
      expect(res.status).toBe(404)
    })

    it('returns booking link with lead details pre-filled', async () => {
      const req = makeGetRequest({ lead_id: LEAD_ID })
      const res = await GET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.booking_link).toBeDefined()
    })
  })
})

describe('POST /api/booking — security: agent_id from session only', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(validateSession as jest.Mock).mockResolvedValue({ id: 'sess-1', userId: AGENT_ID })
    ;(getAgentById as jest.Mock).mockResolvedValue({ data: mockAgent })
    ;(getLeadById as jest.Mock).mockResolvedValue({ data: mockLead })
  })

  it('returns 401 when no session cookie', async () => {
    const req = makePostRequest(
      { lead_id: LEAD_ID, start_time: '2025-01-01T10:00:00Z', end_time: '2025-01-01T11:00:00Z' },
      {}
    )
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 403 when lead belongs to a different agent", async () => {
    ;(getLeadById as jest.Mock).mockResolvedValue({ data: mockLeadOtherAgent })

    const req = makePostRequest({
      lead_id: mockLeadOtherAgent.id,
      start_time: '2025-01-01T10:00:00Z',
      end_time: '2025-01-01T11:00:00Z',
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('uses agent from session, not from request body', async () => {
    const req = makePostRequest({
      lead_id: LEAD_ID,
      start_time: '2025-01-01T10:00:00Z',
      end_time: '2025-01-01T11:00:00Z',
      agent_id: OTHER_AGENT_ID, // attacker's attempt to spoof agent
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    // getAgentById must be called with session agent, not body agent
    expect(getAgentById).toHaveBeenCalledWith(AGENT_ID)
    expect(getAgentById).not.toHaveBeenCalledWith(OTHER_AGENT_ID)
  })

  it('returns 400 for missing required fields', async () => {
    const req = makePostRequest({ lead_id: LEAD_ID })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns booking data for valid request', async () => {
    const req = makePostRequest({
      lead_id: LEAD_ID,
      start_time: '2025-01-01T10:00:00Z',
      end_time: '2025-01-01T11:00:00Z',
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.agent_id).toBe(AGENT_ID)
  })
})
