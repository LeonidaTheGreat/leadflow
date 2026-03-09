/**
 * Session Analytics — Unit Tests
 *
 * Covers:
 *   - logSessionStart() inserts into agent_sessions (US-2)
 *   - logSessionStart() returns null on DB error (NFR: fail silently)
 *   - touchSession() rate-limits to 1 write per 60s (FR-2)
 *   - touchSession() fails silently on error (NFR)
 *   - logPageView() only logs tracked pages (FR-3 / US-3)
 *   - logPageView() strips query strings before matching (FR-3)
 *   - logPageView() ignores untracked pages silently (FR-3)
 *   - endSession() sets session_end (FR-2)
 *   - TRACKED_PAGES constant includes required routes (FR-3 AC)
 */

// ─── Supabase mock (must be hoisted before imports) ───────────────────────────

// We capture mock state in a module-level object so the factory closure can access it
const mockState = {
  fromImpl: null as null | (() => Record<string, jest.Mock>),
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => mockState.fromImpl ? mockState.fromImpl() : {},
  }),
}))

import { logSessionStart, touchSession, logPageView, endSession, TRACKED_PAGES } from '@/lib/session-analytics'

// ─── Test setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockState.fromImpl = null
})

/** Helper: build a supabase chainable that resolves at the given terminal call. */
function makeChain(terminalMethod: string, result: unknown): Record<string, jest.Mock> {
  const chain: Record<string, jest.Mock> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'gte', 'lt', 'order', 'limit', 'single', 'head']
  for (const m of methods) {
    chain[m] = jest.fn(() => {
      if (m === terminalMethod) return Promise.resolve(result)
      return chain
    })
  }
  return chain
}

// ─── logSessionStart ─────────────────────────────────────────────────────────

describe('logSessionStart', () => {
  it('inserts into agent_sessions and returns session id', async () => {
    const sessionId = 'test-session-uuid'
    const chain = makeChain('single', { data: { id: sessionId }, error: null })
    const fromMock = jest.fn(() => chain)
    mockState.fromImpl = () => fromMock() as unknown as Record<string, jest.Mock>

    const result = await logSessionStart('agent-123', '1.2.3.4', 'Mozilla/5.0')

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: 'agent-123',
        ip_address: '1.2.3.4',
        user_agent: 'Mozilla/5.0',
      })
    )
    expect(result).toBe(sessionId)
  })

  it('returns null on DB error (fail silently)', async () => {
    const chain = makeChain('single', { data: null, error: { message: 'DB error' } })
    mockState.fromImpl = () => chain

    const result = await logSessionStart('agent-123')
    expect(result).toBeNull()
  })

  it('returns null when DB throws an exception', async () => {
    mockState.fromImpl = () => {
      throw new Error('unexpected')
    }

    const result = await logSessionStart('agent-123')
    expect(result).toBeNull()
  })
})

// ─── touchSession ─────────────────────────────────────────────────────────────

describe('touchSession', () => {
  it('updates last_active_at on first call for a unique session id', async () => {
    const uniqueSessionId = `touch-first-${Date.now()}-${Math.random()}`
    const chain = makeChain('eq', { data: null, error: null })
    mockState.fromImpl = () => chain

    await touchSession(uniqueSessionId)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ last_active_at: expect.any(String) })
    )
    expect(chain.eq).toHaveBeenCalledWith('id', uniqueSessionId)
  })

  it('skips DB write on second call within 60s (rate limit)', async () => {
    const uniqueSessionId = `touch-ratelimit-${Date.now()}-${Math.random()}`
    const chain = makeChain('eq', { data: null, error: null })
    let callCount = 0
    mockState.fromImpl = () => {
      callCount++
      return chain
    }

    await touchSession(uniqueSessionId)
    const firstCallCount = callCount

    await touchSession(uniqueSessionId)
    const secondCallCount = callCount

    // Second call should NOT have made another DB call
    expect(secondCallCount).toBe(firstCallCount)
  })

  it('fails silently on DB error', async () => {
    const uniqueSessionId = `touch-error-${Date.now()}-${Math.random()}`
    mockState.fromImpl = () => {
      throw new Error('DB is down')
    }

    // Should not throw
    await expect(touchSession(uniqueSessionId)).resolves.toBeUndefined()
  })
})

// ─── logPageView ─────────────────────────────────────────────────────────────

describe('logPageView', () => {
  it('inserts a row for a tracked page (/dashboard)', async () => {
    const chain = makeChain('insert', { data: null, error: null })
    mockState.fromImpl = () => chain

    await logPageView('agent-123', 'session-456', '/dashboard')

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: 'agent-123',
        session_id: 'session-456',
        page: '/dashboard',
      })
    )
  })

  it('logs /dashboard/conversations', async () => {
    const chain = makeChain('insert', { data: null, error: null })
    mockState.fromImpl = () => chain

    await logPageView('agent-123', 'session-456', '/dashboard/conversations')

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ page: '/dashboard/conversations' })
    )
  })

  it('strips query string before logging', async () => {
    const chain = makeChain('insert', { data: null, error: null })
    mockState.fromImpl = () => chain

    await logPageView('agent-123', 'session-456', '/dashboard/billing?tab=invoices')

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ page: '/dashboard/billing' })
    )
  })

  it('skips untracked pages silently without calling from()', async () => {
    let fromCalled = false
    mockState.fromImpl = () => {
      fromCalled = true
      return makeChain('insert', { data: null, error: null })
    }

    await logPageView('agent-123', 'session-456', '/untracked/page')

    expect(fromCalled).toBe(false)
  })

  it('fails silently on DB error', async () => {
    mockState.fromImpl = () => {
      throw new Error('DB error')
    }

    await expect(
      logPageView('agent-123', 'session-456', '/dashboard')
    ).resolves.toBeUndefined()
  })
})

// ─── endSession ──────────────────────────────────────────────────────────────

describe('endSession', () => {
  it('sets session_end timestamp', async () => {
    const chain = makeChain('eq', { data: null, error: null })
    mockState.fromImpl = () => chain

    await endSession('session-end-test')

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ session_end: expect.any(String) })
    )
    expect(chain.eq).toHaveBeenCalledWith('id', 'session-end-test')
  })

  it('fails silently on DB error', async () => {
    mockState.fromImpl = () => { throw new Error('oops') }
    await expect(endSession('session-xyz')).resolves.toBeUndefined()
  })
})

// ─── TRACKED_PAGES constant ───────────────────────────────────────────────────

describe('TRACKED_PAGES', () => {
  it('includes /dashboard', () => {
    expect(TRACKED_PAGES).toContain('/dashboard')
  })

  it('includes /dashboard/conversations', () => {
    expect(TRACKED_PAGES).toContain('/dashboard/conversations')
  })

  it('includes /dashboard/settings', () => {
    expect(TRACKED_PAGES).toContain('/dashboard/settings')
  })

  it('includes /dashboard/billing', () => {
    expect(TRACKED_PAGES).toContain('/dashboard/billing')
  })
})
