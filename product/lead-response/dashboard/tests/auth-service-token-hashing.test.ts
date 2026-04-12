/**
 * @jest-environment node
 */

import crypto from 'crypto'
import { AuthService } from '@/lib/services/AuthService'

describe('AuthService.createSession token storage', () => {
  it('stores only the SHA-256 hash in sessions.token', async () => {
    const rawToken = 'raw-session-token-123'
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const row = {
      id: 'sess-1',
      user_id: 'agent-1',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
      user_agent: 'jest',
      ip_address: '127.0.0.1',
    }

    const single = jest.fn().mockResolvedValue({ data: row, error: null })
    const select = jest.fn().mockReturnValue({ single })
    const insert = jest.fn().mockReturnValue({ select })
    const from = jest.fn().mockReturnValue({ insert })
    const db = { from } as any

    const service = new AuthService(db, 'test-secret')
    jest.spyOn(service, 'generateSessionToken').mockReturnValue(rawToken)

    const session = await service.createSession({ userId: 'agent-1' })

    expect(from).toHaveBeenCalledWith('sessions')
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'agent-1',
        token: expectedHash,
      })
    )
    expect(insert).not.toHaveBeenCalledWith(
      expect.objectContaining({
        token: rawToken,
      })
    )
    expect(session.token).toBe(rawToken)
  })

  it('fails closed if hashing unexpectedly returns the raw token', async () => {
    const insert = jest.fn()
    const from = jest.fn().mockReturnValue({ insert })
    const db = { from } as any
    const service = new AuthService(db, 'test-secret')

    jest.spyOn(service, 'generateSessionToken').mockReturnValue('raw-token')
    jest.spyOn(service as any, 'hashToken').mockReturnValue('raw-token')

    await expect(service.createSession({ userId: 'agent-1' })).rejects.toThrow(
      'Session token hashing failed'
    )
    expect(insert).not.toHaveBeenCalled()
  })
})
