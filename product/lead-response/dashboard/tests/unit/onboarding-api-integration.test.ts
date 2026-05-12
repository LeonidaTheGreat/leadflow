/**
 * @jest-environment node
 *
 * Unit tests for the onboarding API integration:
 *   - /api/agents/check-email  (email availability check)
 *   - /api/agents/onboard      (agent registration + session creation)
 *
 * These tests mock the PostgREST client and AuthService so no real DB
 * or session-table writes occur.
 */

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockMaybeSingle = jest.fn()
const mockSingle = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockInsert = jest.fn()

// Build a chainable query-builder stub
function queryStub(terminalMock: jest.Mock) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    insert: () => chain,
    update: () => chain,
    maybeSingle: terminalMock,
    single: terminalMock,
  }
  return chain
}

jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: jest.fn(),
  },
  isSupabaseConfigured: () => true,
}))

jest.mock('@/lib/services/AuthService', () => ({
  createSession: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { supabaseServer } from '@/lib/supabase-server'
import { createSession } from '@/lib/services/AuthService'
import { NextResponse } from 'next/server'

const mockFrom = supabaseServer.from as jest.Mock
const mockCreateSession = createSession as jest.Mock

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): any {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  }
}

// ─── Tests: /api/agents/check-email ─────────────────────────────────────────

describe('POST /api/agents/check-email', () => {
  let POST: (req: any) => Promise<any>

  beforeAll(async () => {
    const mod = await import('@/app/api/agents/check-email/route')
    POST = mod.POST
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 when email is missing', async () => {
    const req = makeRequest({ email: '' })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/required/i)
  })

  it('returns available:true when no agent exists (maybeSingle returns null)', async () => {
    // maybeSingle returns { data: null, error: null } when no row found
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    mockFrom.mockReturnValue(chain)

    const req = makeRequest({ email: 'new@example.com' })
    const res = await POST(req)
    const body = await res.json()

    expect(body.available).toBe(true)
    expect(body.email).toBe('new@example.com')
  })

  it('returns available:false when agent already exists', async () => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'agent-123' }, error: null }),
    }
    mockFrom.mockReturnValue(chain)

    const req = makeRequest({ email: 'taken@example.com' })
    const res = await POST(req)
    const body = await res.json()

    expect(body.available).toBe(false)
    expect(body.email).toBe('taken@example.com')
  })

  it('lowercases the email before checking', async () => {
    const chain: any = {
      select: () => chain,
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    mockFrom.mockReturnValue(chain)

    const req = makeRequest({ email: 'User@Example.COM' })
    await POST(req)

    // Verify .eq was called with the lowercased email
    expect(chain.eq).toHaveBeenCalledWith('email', 'user@example.com')
  })

  it('returns 500 on unexpected error', async () => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: jest.fn().mockRejectedValue(new Error('DB timeout')),
    }
    mockFrom.mockReturnValue(chain)

    const req = makeRequest({ email: 'error@example.com' })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})

// ─── Tests: /api/agents/onboard ─────────────────────────────────────────────

describe('POST /api/agents/onboard', () => {
  let POST: (req: any) => Promise<any>

  const validBody = {
    email: 'pilot@example.com',
    password: 'Secret1234',
    firstName: 'Jane',
    lastName: 'Smith',
    phoneNumber: '5551234567',
    state: 'California',
  }

  beforeAll(async () => {
    const mod = await import('@/app/api/agents/onboard/route')
    POST = mod.POST
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 when required fields are missing', async () => {
    const req = makeRequest({ email: 'pilot@example.com', password: 'Secret1234' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/missing required/i)
  })

  it('returns 409 when email already exists', async () => {
    // First call: existingUser check → returns a row
    const existingChain: any = {
      select: () => existingChain,
      eq: () => existingChain,
      single: jest.fn().mockResolvedValue({ data: { id: 'existing-id' }, error: null }),
    }
    mockFrom.mockReturnValue(existingChain)

    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('creates agent and sets session cookie on success', async () => {
    // Call 1: existingUser check → no row
    const noRowChain: any = {
      select: () => noRowChain,
      eq: () => noRowChain,
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    // Call 2: insert agent → returns new agent
    const agentData = {
      id: 'new-agent-id',
      email: 'pilot@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      password_hash: '$2b$10$hashed',
      status: 'onboarding',
    }
    const insertChain: any = {
      insert: () => insertChain,
      select: () => insertChain,
      single: jest.fn().mockResolvedValue({ data: agentData, error: null }),
    }
    // Call 3+: integrations and settings inserts (graceful failures OK)
    const ignoreChain: any = {
      insert: () => ignoreChain,
      select: () => ignoreChain,
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }

    mockFrom
      .mockReturnValueOnce(noRowChain)   // existingUser check
      .mockReturnValueOnce(insertChain)  // agent insert
      .mockReturnValue(ignoreChain)      // integrations / settings

    mockCreateSession.mockResolvedValue({
      token: 'session-token-abc',
      userId: 'new-agent-id',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      lastUsedAt: new Date(),
      id: 'session-row-id',
    })

    const req = makeRequest(validBody, { 'user-agent': 'jest-test' })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toMatch(/pilot/i)
    expect(body.agent).toBeDefined()
    // password_hash must NOT be in the response
    expect(body.agent.password_hash).toBeUndefined()

    // Session must have been created
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'new-agent-id' })
    )
  })

  it('still returns 200 when session creation fails (non-blocking)', async () => {
    const noRowChain: any = {
      select: () => noRowChain,
      eq: () => noRowChain,
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    const agentData = {
      id: 'agent-456',
      email: 'pilot2@example.com',
      first_name: 'Bob',
      last_name: 'Lee',
      password_hash: '$2b$10$hashed',
      status: 'onboarding',
    }
    const insertChain: any = {
      insert: () => insertChain,
      select: () => insertChain,
      single: jest.fn().mockResolvedValue({ data: agentData, error: null }),
    }
    const ignoreChain: any = {
      insert: () => ignoreChain,
      select: () => ignoreChain,
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }

    mockFrom
      .mockReturnValueOnce(noRowChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValue(ignoreChain)

    // Session creation fails
    mockCreateSession.mockRejectedValue(new Error('sessions table missing'))

    const req = makeRequest({ ...validBody, email: 'pilot2@example.com' }, { 'user-agent': 'jest-test' })
    const res = await POST(req)

    // Should still succeed — session failure is non-blocking
    expect(res.status).toBe(200)
  })

  it('returns 500 when agent insert fails', async () => {
    const noRowChain: any = {
      select: () => noRowChain,
      eq: () => noRowChain,
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
    const failInsertChain: any = {
      insert: () => failInsertChain,
      select: () => failInsertChain,
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('constraint violation') }),
    }

    mockFrom
      .mockReturnValueOnce(noRowChain)
      .mockReturnValue(failInsertChain)

    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
