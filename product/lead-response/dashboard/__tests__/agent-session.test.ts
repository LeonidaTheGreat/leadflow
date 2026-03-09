/**
 * @jest-environment node
 *
 * Tests for agent session logging (FR-1: logSessionStart integration)
 * PRD: PRD-SESSION-ANALYTICS-PILOT
 * Task: fix-session-logging-not-integrated-into-login-flow
 */
import { getClientIp, logSessionStart } from '@/lib/agent-session'
import { NextRequest } from 'next/server'

// ---- Supabase mock ----
const mockInsertChain = {
  select: jest.fn(),
  single: jest.fn(),
}
const mockInsert = jest.fn(() => mockInsertChain)
mockInsertChain.select.mockReturnValue(mockInsertChain)
mockInsertChain.single.mockResolvedValue({
  data: {
    id: 'session-uuid-123',
    agent_id: 'agent-uuid-456',
    session_start: '2026-03-10T08:00:00.000Z',
    last_active_at: '2026-03-10T08:00:00.000Z',
    ip_address: '1.2.3.4',
    user_agent: 'Mozilla/5.0 Test',
  },
  error: null,
})

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: mockInsert,
    })),
  })),
}))

// ---- Helpers ----
function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers,
  })
}

// ---- Tests ----

describe('getClientIp', () => {
  it('returns the first IP from x-forwarded-for', () => {
    const req = makeRequest({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('returns x-real-ip when x-forwarded-for is absent', () => {
    const req = makeRequest({ 'x-real-ip': '9.9.9.9' })
    expect(getClientIp(req)).toBe('9.9.9.9')
  })

  it('returns null when no IP headers are present', () => {
    const req = makeRequest()
    expect(getClientIp(req)).toBeNull()
  })
})

describe('logSessionStart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockInsertChain.select.mockReturnValue(mockInsertChain)
    mockInsertChain.single.mockResolvedValue({
      data: {
        id: 'session-uuid-123',
        agent_id: 'agent-uuid-456',
        session_start: '2026-03-10T08:00:00.000Z',
        last_active_at: '2026-03-10T08:00:00.000Z',
        ip_address: '1.2.3.4',
        user_agent: 'Mozilla/5.0 Test',
      },
      error: null,
    })
    mockInsert.mockReturnValue(mockInsertChain)
  })

  it('inserts a row and returns the session record', async () => {
    const req = makeRequest({
      'x-forwarded-for': '1.2.3.4',
      'user-agent': 'Mozilla/5.0 Test',
    })

    const result = await logSessionStart('agent-uuid-456', req)

    expect(mockInsert).toHaveBeenCalledTimes(1)
    const insertArg = mockInsert.mock.calls[0][0]
    expect(insertArg.agent_id).toBe('agent-uuid-456')
    expect(insertArg.ip_address).toBe('1.2.3.4')
    expect(insertArg.user_agent).toBe('Mozilla/5.0 Test')
    expect(insertArg.session_start).toBeDefined()
    expect(insertArg.last_active_at).toBeDefined()

    expect(result).not.toBeNull()
    expect(result!.id).toBe('session-uuid-123')
    expect(result!.agentId).toBe('agent-uuid-456')
    expect(result!.ipAddress).toBe('1.2.3.4')
  })

  it('returns null (does not throw) when supabase returns an error', async () => {
    mockInsertChain.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error', code: '23503' },
    })

    const req = makeRequest({ 'x-forwarded-for': '1.2.3.4' })
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await logSessionStart('agent-uuid-456', req)

    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[agent-session] logSessionStart failed:'),
      expect.any(String),
      expect.any(Object)
    )
    consoleSpy.mockRestore()
  })

  it('returns null (does not throw) when an unexpected exception is thrown', async () => {
    mockInsert.mockImplementationOnce(() => {
      throw new Error('Unexpected network error')
    })

    const req = makeRequest()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await logSessionStart('agent-uuid-456', req)

    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })

  it('sets ip_address to null when no IP headers present', async () => {
    const req = makeRequest({ 'user-agent': 'TestAgent/1.0' })
    mockInsertChain.single.mockResolvedValueOnce({
      data: {
        id: 'session-uuid-999',
        agent_id: 'agent-uuid-456',
        session_start: '2026-03-10T08:00:00.000Z',
        last_active_at: '2026-03-10T08:00:00.000Z',
        ip_address: null,
        user_agent: 'TestAgent/1.0',
      },
      error: null,
    })

    await logSessionStart('agent-uuid-456', req)

    const insertArg = mockInsert.mock.calls[0][0]
    expect(insertArg.ip_address).toBeNull()
  })
})
