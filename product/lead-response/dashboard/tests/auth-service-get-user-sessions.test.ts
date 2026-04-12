import { AuthService } from '@/lib/services/AuthService'

describe('AuthService.getUserSessions', () => {
  it('returns session metadata without exposing stored token values', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'sess-1',
          user_id: 'agent-1',
          token: 'stored-token-hash',
          expires_at: '2026-04-30T00:00:00.000Z',
          created_at: '2026-04-01T00:00:00.000Z',
          last_used_at: '2026-04-10T00:00:00.000Z',
          user_agent: 'Jest',
          ip_address: '127.0.0.1',
        },
      ],
      error: null,
    })
    const gt = jest.fn().mockReturnValue({ order })
    const eq = jest.fn().mockReturnValue({ gt })
    const select = jest.fn().mockReturnValue({ eq })
    const from = jest.fn().mockReturnValue({ select })
    const db = { from }

    const service = new AuthService(db as any, 'test-secret')
    const sessions = await service.getUserSessions('agent-1')

    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({
      id: 'sess-1',
      userId: 'agent-1',
      userAgent: 'Jest',
      ipAddress: '127.0.0.1',
    })
    expect('token' in sessions[0]).toBe(false)
  })
})
