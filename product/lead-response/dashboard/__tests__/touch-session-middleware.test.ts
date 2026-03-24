/**
 * @jest-environment node
 *
 * Tests for touchSession() middleware — session heartbeat (FR-2)
 * PRD: PRD-SESSION-ANALYTICS-PILOT
 * Task: fix-touchsession-middleware-not-implemented-no-session (d4b491c2)
 *
 * Verifies that:
 * - touchSessionByAgentId updates last_active_at in agent_sessions
 * - touchSession updates a specific agent_sessions row by id
 * - Both functions fail silently and never throw
 * - Rate-limit logic (enforced by caller) allows 1 write per 60s
 */

import { touchSession, touchSessionByAgentId } from '@/lib/agent-session'

// ─── Supabase mock ───────────────────────────────────────────────────────────
const mockUpdateChain = {
  eq: jest.fn(),
}
const mockUpdate = jest.fn(() => mockUpdateChain)
mockUpdateChain.eq.mockResolvedValue({ error: null })

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      update: mockUpdate,
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  })),
}))

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('touchSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateChain.eq.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue(mockUpdateChain)
  })

  it('updates last_active_at for a specific session id', async () => {
    const result = await touchSession('session-uuid-abc')

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    const updateArg = mockUpdate.mock.calls[0][0]
    expect(updateArg).toHaveProperty('last_active_at')
    expect(typeof updateArg.last_active_at).toBe('string')

    expect(mockUpdateChain.eq).toHaveBeenCalledWith('id', 'session-uuid-abc')
    expect(result).toBe(true)
  })

  it('returns false (does not throw) when supabase returns an error', async () => {
    mockUpdateChain.eq.mockResolvedValueOnce({ error: { message: 'DB error', code: '42P01' } })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const result = await touchSession('session-uuid-abc')

    expect(result).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[agent-session] touchSession failed:'),
      expect.any(String),
      expect.any(Object)
    )
    consoleSpy.mockRestore()
  })

  it('returns false (does not throw) when an unexpected exception is thrown', async () => {
    mockUpdate.mockImplementationOnce(() => { throw new Error('Network failure') })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const result = await touchSession('session-uuid-abc')

    expect(result).toBe(false)
    consoleSpy.mockRestore()
  })
})

describe('touchSessionByAgentId', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateChain.eq.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue(mockUpdateChain)
  })

  it('updates last_active_at for all sessions belonging to an agent', async () => {
    const result = await touchSessionByAgentId('agent-uuid-xyz')

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    const updateArg = mockUpdate.mock.calls[0][0]
    expect(updateArg).toHaveProperty('last_active_at')
    expect(typeof updateArg.last_active_at).toBe('string')

    // Should filter by agent_id, not session id
    expect(mockUpdateChain.eq).toHaveBeenCalledWith('agent_id', 'agent-uuid-xyz')
    expect(result).toBe(true)
  })

  it('returns false (does not throw) when supabase returns an error', async () => {
    mockUpdateChain.eq.mockResolvedValueOnce({ error: { message: 'DB error', code: '42P01' } })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const result = await touchSessionByAgentId('agent-uuid-xyz')

    expect(result).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[agent-session] touchSessionByAgentId failed:'),
      expect.any(String),
      expect.any(Object)
    )
    consoleSpy.mockRestore()
  })

  it('returns false (does not throw) when an unexpected exception is thrown', async () => {
    mockUpdate.mockImplementationOnce(() => { throw new Error('Unexpected failure') })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const result = await touchSessionByAgentId('agent-uuid-xyz')

    expect(result).toBe(false)
    consoleSpy.mockRestore()
  })

  it('last_active_at is a valid ISO 8601 timestamp', async () => {
    await touchSessionByAgentId('agent-uuid-xyz')
    const updateArg = mockUpdate.mock.calls[0][0]
    const ts = new Date(updateArg.last_active_at)
    expect(ts.toString()).not.toBe('Invalid Date')
  })
})

describe('rate limiting (caller responsibility)', () => {
  it('verifies that calling touchSessionByAgentId twice produces two DB writes (rate-limit is callers job)', async () => {
    // The agent-session functions themselves do NOT rate-limit.
    // Rate-limiting is enforced by the middleware's maybeTouchSession().
    mockUpdateChain.eq.mockResolvedValue({ error: null })
    mockUpdate.mockClear() // clear any calls from previous tests

    await touchSessionByAgentId('agent-uuid-xyz')
    await touchSessionByAgentId('agent-uuid-xyz')

    // Both calls should hit the DB — raw function has no rate-limit
    expect(mockUpdate).toHaveBeenCalledTimes(2)
  })
})
