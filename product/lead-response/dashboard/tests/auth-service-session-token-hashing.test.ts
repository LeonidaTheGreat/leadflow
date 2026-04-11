/**
 * @jest-environment node
 */

import crypto from 'crypto'
import { AuthService } from '@/lib/services/AuthService'

describe('AuthService session token handling', () => {
  it('stores only SHA-256 hash in sessions table and returns raw token to caller', async () => {
    const insertPayloads: any[] = []

    const db = {
      from: jest.fn(() => ({
        insert: jest.fn((payload: any) => {
          insertPayloads.push(payload)
          return {
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'sess-1',
                  user_id: payload.user_id,
                  expires_at: payload.expires_at,
                  created_at: payload.created_at,
                  last_used_at: payload.last_used_at,
                  user_agent: payload.user_agent,
                  ip_address: payload.ip_address,
                },
                error: null,
              }),
            })),
          }
        }),
      })),
    }

    const service = new AuthService(db as any)
    const rawToken = 'raw-session-token-123'
    jest.spyOn(service, 'generateSessionToken').mockReturnValue(rawToken)

    const session = await service.createSession({ userId: 'agent-1' })

    expect(insertPayloads).toHaveLength(1)
    const persistedToken = insertPayloads[0].token
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    expect(persistedToken).toBe(expectedHash)
    expect(persistedToken).not.toBe(rawToken)
    expect(session.token).toBe(rawToken)
  })

  it('does not expose persisted token values in session summaries', async () => {
    const db = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gt: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'sess-1',
                    user_id: 'agent-1',
                    token: 'stored-hash-value',
                    expires_at: '2026-12-01T00:00:00.000Z',
                    created_at: '2026-11-01T00:00:00.000Z',
                    last_used_at: '2026-11-02T00:00:00.000Z',
                    user_agent: 'UA',
                    ip_address: '127.0.0.1',
                  },
                ],
                error: null,
              }),
            })),
          })),
        })),
      })),
    }

    const service = new AuthService(db as any)
    const summaries = await service.getUserSessions('agent-1')

    expect(summaries).toHaveLength(1)
    expect(summaries[0]).not.toHaveProperty('token')
    expect(summaries[0].id).toBe('sess-1')
    expect(summaries[0].userId).toBe('agent-1')
  })
})
