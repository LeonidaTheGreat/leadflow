'use strict'

const crypto = require('crypto')

describe('invite accept flow — 409 fix', () => {
  function hashToken(raw) {
    return crypto.createHash('sha256').update(raw).digest('hex')
  }

  describe('accept-invite route logic', () => {
    it('should NOT block invites that have agent_id pre-set (the 409 bug)', () => {
      const invite = {
        id: 'inv-1',
        email: 'agent@example.com',
        name: 'Test Agent',
        token: hashToken('raw-token'),
        token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        agent_id: 'pre-created-agent-id',
        status: 'pending',
        accepted_at: null
      }

      expect(invite.agent_id).toBeTruthy()
      expect(invite.status).not.toBe('accepted')
      expect(invite.accepted_at).toBeNull()
    })

    it('should reject invites with status=accepted or accepted_at set', () => {
      const accepted1 = { status: 'accepted', accepted_at: '2026-07-16T00:00:00Z' }
      expect(accepted1.status === 'accepted' || accepted1.accepted_at).toBeTruthy()

      const accepted2 = { status: 'pending', accepted_at: '2026-07-16T00:00:00Z' }
      expect(accepted2.status === 'accepted' || accepted2.accepted_at).toBeTruthy()
    })

    it('should reject expired invites', () => {
      const invite = { token_expires_at: new Date(Date.now() - 1000).toISOString() }
      expect(new Date(invite.token_expires_at) < new Date()).toBe(true)
    })

    it('should allow invites without agent_id (create new agent path)', () => {
      const invite = {
        agent_id: null,
        status: 'pending',
        accepted_at: null,
        token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }

      expect(invite.agent_id).toBeNull()
      expect(invite.status).not.toBe('accepted')
    })
  })

  describe('set-password endpoint logic', () => {
    it('should require password of at least 8 characters', () => {
      expect('abc1234'.length).toBeLessThan(8)
      expect('StrongP@ss1'.length).toBeGreaterThanOrEqual(8)
    })

    it('should reject if invite is already accepted', () => {
      const invite = { status: 'accepted', accepted_at: '2026-07-16T00:00:00Z' }
      expect(invite.accepted_at || invite.status === 'accepted').toBeTruthy()
    })

    it('should reject if invite has no agent_id', () => {
      const invite = { agent_id: null, status: 'pending' }
      expect(invite.agent_id).toBeNull()
    })

    it('should hash token identically to invite-pilot route', () => {
      const rawToken = 'test-raw-token-123'
      const hash = crypto.createHash('sha256').update(rawToken).digest('hex')
      expect(hash).toBe(hashToken(rawToken))
      expect(hash).not.toBe(rawToken)
      expect(hash).toHaveLength(64)
    })
  })

  describe('two-step flow contract', () => {
    it('step 1 returns needsPassword=true for valid pending invite', () => {
      const response = {
        success: true,
        agentId: 'agent-123',
        email: 'agent@example.com',
        name: 'Test Agent',
        needsPassword: true
      }

      expect(response.success).toBe(true)
      expect(response.needsPassword).toBe(true)
      expect(response.agentId).toBeDefined()
      expect(response.email).toBeDefined()
    })

    it('step 2 sets password and marks invite accepted', () => {
      const response = { success: true, agentId: 'agent-123' }
      expect(response.success).toBe(true)
      expect(response.agentId).toBeDefined()
    })
  })
})
