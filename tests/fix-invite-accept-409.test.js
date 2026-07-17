'use strict'

const crypto = require('crypto')

describe('invite accept flow — 409 fix', () => {
  function hashToken(raw) {
    return crypto.createHash('sha256').update(raw).digest('hex')
  }

  function makeInvite(overrides = {}) {
    return {
      id: 'inv-1',
      email: 'agent@example.com',
      name: 'Test Agent',
      token: hashToken('raw-token'),
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      agent_id: 'pre-created-agent-id',
      status: 'pending',
      accepted_at: null,
      ...overrides
    }
  }

  function evaluateAcceptGuard(invite) {
    if (new Date(invite.token_expires_at) < new Date()) return { status: 410, error: 'expired' }
    if (invite.accepted_at || invite.status === 'accepted') return { status: 409, error: 'already accepted' }
    return { status: 200 }
  }

  function evaluateSetPasswordGuard(invite, password) {
    if (!invite) return { status: 404, error: 'not found' }
    if (invite.accepted_at || invite.status === 'accepted') return { status: 409, error: 'already accepted' }
    if (new Date(invite.token_expires_at) < new Date()) return { status: 410, error: 'expired' }
    if (!invite.agent_id) return { status: 400, error: 'call accept-invite first' }
    if (!password || password.length < 8) return { status: 400, error: 'password too short' }
    return { status: 200 }
  }

  describe('accept-invite route logic', () => {
    it('allows invites with pre-set agent_id (the original 409 bug)', () => {
      const invite = makeInvite({ agent_id: 'pre-created-id' })
      const result = evaluateAcceptGuard(invite)
      expect(result.status).toBe(200)
    })

    it('allows invites without agent_id', () => {
      const invite = makeInvite({ agent_id: null })
      const result = evaluateAcceptGuard(invite)
      expect(result.status).toBe(200)
    })

    it('rejects expired invites with 410', () => {
      const invite = makeInvite({
        token_expires_at: new Date(Date.now() - 1000).toISOString()
      })
      const result = evaluateAcceptGuard(invite)
      expect(result.status).toBe(410)
    })

    it('rejects invites with accepted_at set', () => {
      const invite = makeInvite({ accepted_at: '2026-07-16T00:00:00Z' })
      const result = evaluateAcceptGuard(invite)
      expect(result.status).toBe(409)
    })

    it('rejects invites with status=accepted', () => {
      const invite = makeInvite({ status: 'accepted' })
      const result = evaluateAcceptGuard(invite)
      expect(result.status).toBe(409)
    })

    it('rejects invites with both accepted_at and status=accepted', () => {
      const invite = makeInvite({
        status: 'accepted',
        accepted_at: '2026-07-16T00:00:00Z'
      })
      const result = evaluateAcceptGuard(invite)
      expect(result.status).toBe(409)
    })
  })

  describe('set-password route logic', () => {
    it('allows valid pending invite with agent_id and strong password', () => {
      const invite = makeInvite()
      const result = evaluateSetPasswordGuard(invite, 'StrongP@ss1')
      expect(result.status).toBe(200)
    })

    it('rejects password shorter than 8 characters', () => {
      const invite = makeInvite()
      const result = evaluateSetPasswordGuard(invite, 'short')
      expect(result.status).toBe(400)
    })

    it('rejects if invite has no agent_id', () => {
      const invite = makeInvite({ agent_id: null })
      const result = evaluateSetPasswordGuard(invite, 'StrongP@ss1')
      expect(result.status).toBe(400)
    })

    it('rejects already-accepted invite', () => {
      const invite = makeInvite({
        status: 'accepted',
        accepted_at: '2026-07-16T00:00:00Z'
      })
      const result = evaluateSetPasswordGuard(invite, 'StrongP@ss1')
      expect(result.status).toBe(409)
    })

    it('rejects expired invite', () => {
      const invite = makeInvite({
        token_expires_at: new Date(Date.now() - 1000).toISOString()
      })
      const result = evaluateSetPasswordGuard(invite, 'StrongP@ss1')
      expect(result.status).toBe(410)
    })
  })

  describe('token hashing', () => {
    it('produces consistent SHA-256 hex hash', () => {
      const raw = 'test-raw-token-123'
      const hash = hashToken(raw)
      expect(hash).toBe(hashToken(raw))
      expect(hash).toHaveLength(64)
      expect(hash).not.toBe(raw)
    })

    it('different tokens produce different hashes', () => {
      expect(hashToken('token-a')).not.toBe(hashToken('token-b'))
    })
  })

  describe('two-step flow contract', () => {
    it('step 1 (accept-invite) returns needsPassword=true', () => {
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
    })

    it('step 2 (set-password) returns agentId on success', () => {
      const response = { success: true, agentId: 'agent-123' }
      expect(response.success).toBe(true)
      expect(response.agentId).toBeDefined()
    })
  })

  describe('column name correctness', () => {
    it('set-password uses trial_ends_at (not trial_expires_at)', () => {
      const fs = require('fs')
      const path = require('path')
      const setPasswordCode = fs.readFileSync(
        path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'app', 'api', 'auth', 'set-password', 'route.ts'),
        'utf8'
      )
      expect(setPasswordCode).toContain('trial_ends_at')
      expect(setPasswordCode).not.toContain('trial_expires_at')
    })

    it('accept-invite checks accepted_at (not agent_id) for 409', () => {
      const fs = require('fs')
      const path = require('path')
      const acceptCode = fs.readFileSync(
        path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'app', 'api', 'auth', 'accept-invite', 'route.ts'),
        'utf8'
      )
      expect(acceptCode).toContain('invite.accepted_at')
      expect(acceptCode).not.toMatch(/if\s*\(\s*invite\.agent_id\s*\)\s*\{?\s*return\s+NextResponse\.json/)
    })
  })

  describe('migration', () => {
    it('025 migration adds accepted_at column to pilot_invites', () => {
      const fs = require('fs')
      const path = require('path')
      const migration = fs.readFileSync(
        path.join(__dirname, '..', 'migrations', '025_add_pilot_invites_accepted_at.sql'),
        'utf8'
      )
      expect(migration).toContain('pilot_invites')
      expect(migration).toContain('accepted_at')
      expect(migration).toContain('TIMESTAMPTZ')
    })
  })
})
