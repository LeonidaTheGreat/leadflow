import { AuthService } from '@/lib/services/AuthService'

function makeCreateSessionDb(insertSpy: jest.Mock) {
  return {
    from: jest.fn(() => ({
      insert: (payload: any) => {
        insertSpy(payload)
        return {
          select: () => ({
            single: async () => ({
              data: {
                id: 'session-1',
                ...payload,
              },
              error: null,
            }),
          }),
        }
      },
    })),
  }
}

describe('AuthService', () => {
  beforeAll(() => {
    // Jest jsdom does not guarantee Web Crypto; force Node WebCrypto for deterministic tests.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('node:crypto')
    Object.defineProperty(globalThis, 'crypto', {
      value: nodeCrypto.webcrypto,
      configurable: true,
    })
  })

  it('generateToken and hashToken produce secure hex values', async () => {
    const service = new AuthService({ from: jest.fn() } as any)
    const token = service.generateToken()
    const hash = await service.hashToken(token)

    expect(token).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).not.toBe(token)
  })

  it('createSession stores token hash in DB and returns raw token to caller', async () => {
    const insertSpy = jest.fn()
    const db = makeCreateSessionDb(insertSpy)
    const service = new AuthService(db as any)

    jest.spyOn(service, 'generateToken').mockReturnValue('a'.repeat(64))

    const created = await service.createSession({ userId: 'agent-1', rememberMe: false })

    expect(insertSpy).toHaveBeenCalledTimes(1)
    const payload = insertSpy.mock.calls[0][0]
    expect(payload.user_id).toBe('agent-1')
    expect(payload.token).toMatch(/^[a-f0-9]{64}$/)
    expect(payload.token).not.toBe('a'.repeat(64))
    expect(created.token).toBe('a'.repeat(64))
    expect(created.userId).toBe('agent-1')
  })

  it('validateSession destroys expired sessions and returns null', async () => {
    const deleteEqSpy = jest.fn(async () => ({ error: null }))
    const db = {
      from: jest.fn(() => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: 'session-2',
                user_id: 'agent-2',
                token: 'hash',
                expires_at: new Date(Date.now() - 1000).toISOString(),
                created_at: new Date().toISOString(),
                last_used_at: new Date().toISOString(),
                user_agent: null,
                ip_address: null,
              },
              error: null,
            }),
          }),
        }),
        delete: () => ({
          eq: deleteEqSpy,
        }),
      })),
    }
    const service = new AuthService(db as any)

    const result = await service.validateSession('raw-token')

    expect(result).toBeNull()
    expect(deleteEqSpy).toHaveBeenCalledTimes(1)
  })
})
