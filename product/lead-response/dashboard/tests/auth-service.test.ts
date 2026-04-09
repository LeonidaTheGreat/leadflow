/**
 * @jest-environment node
 */

import { AuthService } from '@/lib/services/AuthService'

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
