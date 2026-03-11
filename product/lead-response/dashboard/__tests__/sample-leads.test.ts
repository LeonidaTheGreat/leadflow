/**
 * @jest-environment node
 *
 * Tests for the sample leads endpoint (FR-4: First-session sample leads)
 * PRD: AC-2 — 3 sample leads with AI-drafted responses on first dashboard visit.
 * Task: fix-first-session-sample-leads-fr-4-not-implemented (1860b20c)
 */

// ─── Mock Next.js server modules ──────────────────────────────────────────────

const mockCookies = new Map<string, { value: string }>()

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}))

// ─── Mock jsonwebtoken ────────────────────────────────────────────────────────

const mockJwtVerify = jest.fn()
jest.mock('jsonwebtoken', () => ({
  verify: (...args: unknown[]) => mockJwtVerify(...args),
}))

// ─── Mock supabase-server ─────────────────────────────────────────────────────

const mockSingle = jest.fn()
const mockEq = jest.fn(() => ({ single: mockSingle }))
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('../lib/supabase-server', () => ({
  supabaseServer: { from: (...args: unknown[]) => mockFrom(...args) },
  isSupabaseConfigured: jest.fn(() => true),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { isSupabaseConfigured } from '../lib/supabase-server'

function makeRequest(cookies: Record<string, string> = {}) {
  return {
    cookies: {
      get: (name: string) =>
        cookies[name] ? { value: cookies[name] } : undefined,
    },
  } as any
}

// ─── Import route after mocks ─────────────────────────────────────────────────

import { GET } from '../app/api/sample-leads/route'
import { NextResponse } from 'next/server'

const jsonSpy = NextResponse.json as jest.Mock

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  ;(isSupabaseConfigured as jest.Mock).mockReturnValue(true)
  jsonSpy.mockImplementation((body: unknown, init?: { status?: number }) => ({
    body,
    status: init?.status ?? 200,
  }))
})

// ── 1. Supabase not configured ─────────────────────────────────────────────────

describe('GET /api/sample-leads — Supabase not configured', () => {
  it('returns eligible:false with empty leads (build/dev safety)', async () => {
    ;(isSupabaseConfigured as jest.Mock).mockReturnValue(false)

    const req = makeRequest()
    const res = await GET(req)

    expect(res.body).toEqual({ eligible: false, leads: [] })
    expect(res.status).toBe(200)
  })
})

// ── 2. No auth token ──────────────────────────────────────────────────────────

describe('GET /api/sample-leads — no auth token', () => {
  it('returns 401 when no cookie is present', async () => {
    const req = makeRequest({}) // no auth_token or auth-token cookie
    const res = await GET(req)

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Unauthorized' })
  })
})

// ── 3. Invalid JWT ────────────────────────────────────────────────────────────

describe('GET /api/sample-leads — invalid JWT', () => {
  it('returns 401 when JWT verification throws', async () => {
    mockJwtVerify.mockImplementation(() => {
      throw new Error('invalid token')
    })

    const req = makeRequest({ auth_token: 'bad.token.here' })
    const res = await GET(req)

    expect(res.status).toBe(401)
  })
})

// ── 4. First-session user (onboarding_completed = false) ──────────────────────

describe('GET /api/sample-leads — first-session user', () => {
  beforeEach(() => {
    mockJwtVerify.mockReturnValue({ id: 'agent-123' })
    mockSingle.mockResolvedValue({
      data: { id: 'agent-123', onboarding_completed: false, plan_tier: 'trial' },
      error: null,
    })
  })

  it('returns eligible:true with 3 sample leads', async () => {
    const req = makeRequest({ auth_token: 'valid.jwt.here' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(res.body.eligible).toBe(true)
    expect(Array.isArray(res.body.leads)).toBe(true)
    expect(res.body.leads).toHaveLength(3)
  })

  it('all sample leads have is_sample:true', async () => {
    const req = makeRequest({ auth_token: 'valid.jwt.here' })
    const res = await GET(req)

    res.body.leads.forEach((lead: any) => {
      expect(lead.is_sample).toBe(true)
    })
  })

  it('all sample leads have ai_drafted_response', async () => {
    const req = makeRequest({ auth_token: 'valid.jwt.here' })
    const res = await GET(req)

    res.body.leads.forEach((lead: any) => {
      expect(typeof lead.ai_drafted_response).toBe('string')
      expect(lead.ai_drafted_response.length).toBeGreaterThan(20)
    })
  })

  it('all sample leads have required Lead fields', async () => {
    const req = makeRequest({ auth_token: 'valid.jwt.here' })
    const res = await GET(req)

    const requiredFields = ['id', 'name', 'phone', 'source', 'status', 'created_at']
    res.body.leads.forEach((lead: any) => {
      requiredFields.forEach((field) => {
        expect(lead).toHaveProperty(field)
      })
    })
  })

  it('sample lead IDs start with "sample-lead-"', async () => {
    const req = makeRequest({ auth_token: 'valid.jwt.here' })
    const res = await GET(req)

    res.body.leads.forEach((lead: any) => {
      expect(lead.id).toMatch(/^sample-lead-/)
    })
  })

  it('accepts auth-token cookie name (alternative format)', async () => {
    const req = makeRequest({ 'auth-token': 'valid.jwt.here' })
    const res = await GET(req)

    expect(res.body.eligible).toBe(true)
    expect(res.body.leads).toHaveLength(3)
  })

  it('accepts userId claim in JWT payload (login route format)', async () => {
    mockJwtVerify.mockReturnValue({ userId: 'agent-456' })
    mockSingle.mockResolvedValue({
      data: { id: 'agent-456', onboarding_completed: false, plan_tier: 'trial' },
      error: null,
    })

    const req = makeRequest({ auth_token: 'valid.jwt.here' })
    const res = await GET(req)

    expect(res.body.eligible).toBe(true)
  })
})

// ── 5. Returning user (onboarding_completed = true) ──────────────────────────

describe('GET /api/sample-leads — returning user', () => {
  beforeEach(() => {
    mockJwtVerify.mockReturnValue({ id: 'agent-789' })
    mockSingle.mockResolvedValue({
      data: { id: 'agent-789', onboarding_completed: true, plan_tier: 'trial' },
      error: null,
    })
  })

  it('returns eligible:false with empty leads array', async () => {
    const req = makeRequest({ auth_token: 'valid.jwt.here' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(res.body.eligible).toBe(false)
    expect(res.body.leads).toHaveLength(0)
  })
})

// ── 6. Agent not found in DB ──────────────────────────────────────────────────

describe('GET /api/sample-leads — agent not in DB', () => {
  it('returns eligible:false gracefully when agent row missing', async () => {
    mockJwtVerify.mockReturnValue({ id: 'ghost-agent' })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const req = makeRequest({ auth_token: 'valid.jwt.here' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(res.body.eligible).toBe(false)
  })
})

// ── 7. Lead data integrity — no DB contamination ──────────────────────────────

describe('Sample leads data integrity', () => {
  beforeEach(() => {
    mockJwtVerify.mockReturnValue({ id: 'agent-111' })
    mockSingle.mockResolvedValue({
      data: { id: 'agent-111', onboarding_completed: false, plan_tier: 'trial' },
      error: null,
    })
  })

  it('no INSERT is called — sample leads are never written to DB', async () => {
    const req = makeRequest({ auth_token: 'valid.jwt.here' })
    await GET(req)

    // mockFrom is called only for SELECT (agent lookup)
    // Verify it's only called once and only for select
    expect(mockFrom).toHaveBeenCalledWith('real_estate_agents')
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('all sample leads have agent_id: null (not tied to any agent)', async () => {
    const req = makeRequest({ auth_token: 'valid.jwt.here' })
    const res = await GET(req)

    res.body.leads.forEach((lead: any) => {
      expect(lead.agent_id).toBeNull()
    })
  })

  it('sample lead IDs are unique across all three leads', async () => {
    const req = makeRequest({ auth_token: 'valid.jwt.here' })
    const res = await GET(req)

    const ids = res.body.leads.map((l: any) => l.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })
})
