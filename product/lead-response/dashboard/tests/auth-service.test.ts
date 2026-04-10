/**
 * @jest-environment node
 */

import { AuthService, TRACKED_PAGES } from '@/lib/services/AuthService'
import { NextRequest } from 'next/server'

type QueryResult = { data: any; error: any; count?: number | null }

function makeInsertChain(result: QueryResult, capture?: (payload: any) => void) {
  return {
    insert: (payload: any) => {
      capture?.(payload)
      return {
        select: () => ({
          single: async () => result,
        }),
      }
    },
  }
}

function makeSelectSingleChain(result: QueryResult) {
  return {
    select: () => ({
      eq: () => ({
        single: async () => result,
      }),
    }),
  }
}

function makeUpdateChain(result: QueryResult) {
  return {
    update: () => ({
      eq: async () => result,
    }),
  }
}

function makeDeleteChain(result: QueryResult) {
  return {
    delete: () => ({
      eq: async () => result,
    }),
  }
}

describe('AuthService', () => {
  it('generateToken returns 64-char hex string', () => {
    const service = new AuthService({} as any)
    const tokenA = service.generateToken()
    const tokenB = service.generateToken()

    expect(tokenA).toMatch(/^[a-f0-9]{64}$/)
    expect(tokenB).toMatch(/^[a-f0-9]{64}$/)
    expect(tokenA).not.toEqual(tokenB)
  })

  it('hashToken hashes deterministically with sha256', async () => {
    const service = new AuthService({} as any)

    const hashA = await service.hashToken('same-token')
    const hashB = await service.hashToken('same-token')
    const hashC = await service.hashToken('different-token')

    expect(hashA).toMatch(/^[a-f0-9]{64}$/)
    expect(hashA).toEqual(hashB)
    expect(hashA).not.toEqual(hashC)
  })

  it('createSession inserts a session row and maps response', async () => {
    const now = new Date().toISOString()
    const insertedRow = {
      id: 'sess-1',
      user_id: 'agent-1',
      token: 'token-1',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      created_at: now,
      last_used_at: now,
      user_agent: 'ua',
      ip_address: '127.0.0.1',
    }

    let insertedPayload: any = null
    const db = {
      from: jest.fn(() => makeInsertChain({ data: insertedRow, error: null }, (payload) => {
        insertedPayload = payload
      })),
    }

    const service = new AuthService(db as any)
    const session = await service.createSession({
      userId: 'agent-1',
      userAgent: 'ua',
      ipAddress: '127.0.0.1',
      rememberMe: false,
    })

    expect(db.from).toHaveBeenCalledWith('sessions')
    expect(insertedPayload.user_id).toEqual('agent-1')
    expect(insertedPayload.user_agent).toEqual('ua')
    expect(insertedPayload.ip_address).toEqual('127.0.0.1')
    expect(typeof insertedPayload.token).toBe('string')
    expect(session).toMatchObject({
      id: 'sess-1',
      userId: 'agent-1',
      token: 'token-1',
      userAgent: 'ua',
      ipAddress: '127.0.0.1',
    })
  })

  it('validateSession returns null when session lookup fails', async () => {
    const db = {
      from: jest.fn(() => makeSelectSingleChain({ data: null, error: new Error('not found') })),
    }

    const service = new AuthService(db as any)
    const session = await service.validateSession('missing-token')

    expect(session).toBeNull()
  })

  it('validateSession destroys expired sessions', async () => {
    const expiredRow = {
      id: 'sess-exp',
      user_id: 'agent-1',
      token: 'expired-token',
      expires_at: new Date(Date.now() - 60_000).toISOString(),
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
      user_agent: null,
      ip_address: null,
    }

    const db = {
      from: jest.fn(() => makeSelectSingleChain({ data: expiredRow, error: null })),
    }

    const service = new AuthService(db as any)
    const destroySpy = jest.spyOn(service, 'destroySession').mockResolvedValue()

    const session = await service.validateSession('expired-token')

    expect(session).toBeNull()
    expect(destroySpy).toHaveBeenCalledWith('expired-token')
  })

  it('destroySession deletes by token', async () => {
    const deleteEq = jest.fn(async () => ({ data: null, error: null }))
    const db = {
      from: jest.fn(() => ({
        delete: () => ({
          eq: deleteEq,
        }),
      })),
    }

    const service = new AuthService(db as any)
    await service.destroySession('session-token')

    expect(db.from).toHaveBeenCalledWith('sessions')
    expect(deleteEq).toHaveBeenCalledWith('token', 'session-token')
  })

  it('validateSession updates last_used_at and returns mapped session', async () => {
    const validRow = {
      id: 'sess-ok',
      user_id: 'agent-22',
      token: 'valid-token',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      created_at: new Date().toISOString(),
      last_used_at: new Date(Date.now() - 120_000).toISOString(),
      user_agent: 'test-agent',
      ip_address: '10.0.0.2',
    }

    const db = {
      from: jest
        .fn()
        .mockImplementationOnce(() => makeSelectSingleChain({ data: validRow, error: null }))
        .mockImplementationOnce(() => makeUpdateChain({ data: null, error: null })),
    }

    const service = new AuthService(db as any)
    const session = await service.validateSession('valid-token')

    expect(db.from).toHaveBeenNthCalledWith(1, 'sessions')
    expect(db.from).toHaveBeenNthCalledWith(2, 'sessions')
    expect(session?.id).toEqual('sess-ok')
    expect(session?.userId).toEqual('agent-22')
    expect(session?.token).toEqual('valid-token')
    expect(session?.userAgent).toEqual('test-agent')
    expect(session?.ipAddress).toEqual('10.0.0.2')
    expect(session?.lastUsedAt instanceof Date).toBe(true)
  })
})

// ─── Agent Session Methods ────────────────────────────────────────────────────

describe('AuthService.getClientIp (static)', () => {
  function makeReq(headers: Record<string, string>) {
    return new NextRequest('http://localhost/', { headers })
  }

  it('returns first IP from x-forwarded-for', () => {
    const req = makeReq({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(AuthService.getClientIp(req)).toBe('1.2.3.4')
  })

  it('returns x-real-ip when x-forwarded-for is absent', () => {
    const req = makeReq({ 'x-real-ip': '9.9.9.9' })
    expect(AuthService.getClientIp(req)).toBe('9.9.9.9')
  })

  it('returns null when no IP headers present', () => {
    const req = makeReq({})
    expect(AuthService.getClientIp(req)).toBeNull()
  })
})

describe('AuthService.logAgentSessionStart', () => {
  it('inserts into agent_sessions and returns the session record', async () => {
    const now = new Date().toISOString()
    const mockRow = {
      id: 'asess-1',
      agent_id: 'agent-abc',
      session_start: now,
      last_active_at: now,
      ip_address: '1.2.3.4',
      user_agent: 'TestAgent/1.0',
    }

    let capturedPayload: any = null
    const db = {
      from: jest.fn(() => ({
        insert: (payload: any) => {
          capturedPayload = payload
          return { select: () => ({ single: async () => ({ data: mockRow, error: null }) }) }
        },
      })),
    }

    const service = new AuthService(db as any)
    const record = await service.logAgentSessionStart('agent-abc', '1.2.3.4', 'TestAgent/1.0')

    expect(db.from).toHaveBeenCalledWith('agent_sessions')
    expect(capturedPayload.agent_id).toBe('agent-abc')
    expect(capturedPayload.ip_address).toBe('1.2.3.4')
    expect(capturedPayload.user_agent).toBe('TestAgent/1.0')
    expect(capturedPayload.session_start).toBeDefined()
    expect(capturedPayload.last_active_at).toBeDefined()

    expect(record).toMatchObject({
      id: 'asess-1',
      agentId: 'agent-abc',
      ipAddress: '1.2.3.4',
      userAgent: 'TestAgent/1.0',
    })
  })

  it('throws when DB returns an error', async () => {
    const dbError = { message: 'insert failed', code: '23503' }
    const db = {
      from: jest.fn(() => ({
        insert: () => ({
          select: () => ({ single: async () => ({ data: null, error: dbError }) }),
        }),
      })),
    }

    const service = new AuthService(db as any)
    await expect(service.logAgentSessionStart('agent-abc', null, null)).rejects.toMatchObject({
      message: 'insert failed',
    })
  })

  it('sets ip_address and user_agent to null when not provided', async () => {
    const now = new Date().toISOString()
    let capturedPayload: any = null
    const db = {
      from: jest.fn(() => ({
        insert: (payload: any) => {
          capturedPayload = payload
          return {
            select: () => ({
              single: async () => ({
                data: { id: 'x', agent_id: 'agent-abc', session_start: now, last_active_at: now, ip_address: null, user_agent: null },
                error: null,
              }),
            }),
          }
        },
      })),
    }

    const service = new AuthService(db as any)
    await service.logAgentSessionStart('agent-abc', null, null)

    expect(capturedPayload.ip_address).toBeNull()
    expect(capturedPayload.user_agent).toBeNull()
  })
})

describe('AuthService.touchAgentSession', () => {
  it('updates last_active_at by session id and returns true', async () => {
    const updateEq = jest.fn(async () => ({ error: null }))
    const db = {
      from: jest.fn(() => ({
        update: jest.fn(() => ({ eq: updateEq })),
      })),
    }

    const service = new AuthService(db as any)
    const result = await service.touchAgentSession('sess-id-1')

    expect(result).toBe(true)
    expect(updateEq).toHaveBeenCalledWith('id', 'sess-id-1')
  })

  it('throws when DB returns an error', async () => {
    const dbError = { message: 'update failed', code: '42P01' }
    const db = {
      from: jest.fn(() => ({
        update: jest.fn(() => ({ eq: jest.fn(async () => ({ error: dbError })) })),
      })),
    }

    const service = new AuthService(db as any)
    await expect(service.touchAgentSession('sess-id-1')).rejects.toMatchObject({ message: 'update failed' })
  })
})

describe('AuthService.touchAgentSessionByAgentId', () => {
  it('updates last_active_at by agent_id and returns true', async () => {
    const updateEq = jest.fn(async () => ({ error: null }))
    const db = {
      from: jest.fn(() => ({
        update: jest.fn(() => ({ eq: updateEq })),
      })),
    }

    const service = new AuthService(db as any)
    const result = await service.touchAgentSessionByAgentId('agent-xyz')

    expect(result).toBe(true)
    expect(updateEq).toHaveBeenCalledWith('agent_id', 'agent-xyz')
  })

  it('throws when DB returns an error', async () => {
    const dbError = { message: 'update failed', code: '42P01' }
    const db = {
      from: jest.fn(() => ({
        update: jest.fn(() => ({ eq: jest.fn(async () => ({ error: dbError })) })),
      })),
    }

    const service = new AuthService(db as any)
    await expect(service.touchAgentSessionByAgentId('agent-xyz')).rejects.toMatchObject({ message: 'update failed' })
  })
})

describe('AuthService.logPageView', () => {
  it('inserts a row for tracked pages', async () => {
    const insertMock = jest.fn(async () => ({ data: null, error: null }))
    const db = {
      from: jest.fn(() => ({ insert: insertMock })),
    }

    const service = new AuthService(db as any)
    await service.logPageView('agent-abc', 'sess-1', '/dashboard')

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: 'agent-abc',
        session_id: 'sess-1',
        page: '/dashboard',
      })
    )
  })

  it('skips DB call for untracked pages', async () => {
    let fromCalled = false
    const db = {
      from: jest.fn(() => { fromCalled = true; return { insert: jest.fn() } }),
    }

    const service = new AuthService(db as any)
    await service.logPageView('agent-abc', 'sess-1', '/untracked/page')

    expect(fromCalled).toBe(false)
  })

  it('strips query strings before checking page', async () => {
    const insertMock = jest.fn(async () => ({ data: null, error: null }))
    const db = {
      from: jest.fn(() => ({ insert: insertMock })),
    }

    const service = new AuthService(db as any)
    await service.logPageView('agent-abc', 'sess-1', '/dashboard/billing?tab=invoices')

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: '/dashboard/billing' })
    )
  })

  it('fails silently on DB error', async () => {
    const db = {
      from: jest.fn(() => { throw new Error('DB down') }),
    }

    const service = new AuthService(db as any)
    await expect(service.logPageView('agent-abc', 'sess-1', '/dashboard')).resolves.toBeUndefined()
  })
})

describe('AuthService.endAgentSession', () => {
  it('sets session_end timestamp', async () => {
    const updateEq = jest.fn(async () => ({ error: null }))
    const db = {
      from: jest.fn(() => ({
        update: jest.fn(() => ({ eq: updateEq })),
      })),
    }

    const service = new AuthService(db as any)
    await service.endAgentSession('sess-end-1')

    expect(updateEq).toHaveBeenCalledWith('id', 'sess-end-1')
  })

  it('fails silently on DB error', async () => {
    const db = {
      from: jest.fn(() => { throw new Error('DB down') }),
    }

    const service = new AuthService(db as any)
    await expect(service.endAgentSession('sess-end-1')).resolves.toBeUndefined()
  })
})

describe('TRACKED_PAGES', () => {
  it('includes required dashboard routes', () => {
    expect(TRACKED_PAGES).toContain('/dashboard')
    expect(TRACKED_PAGES).toContain('/dashboard/conversations')
    expect(TRACKED_PAGES).toContain('/dashboard/settings')
    expect(TRACKED_PAGES).toContain('/dashboard/billing')
  })
})
