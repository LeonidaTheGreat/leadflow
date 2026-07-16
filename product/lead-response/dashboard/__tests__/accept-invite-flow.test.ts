/**
 * @jest-environment node
 *
 * Tests for the two-step invite-accept flow:
 *   POST /api/auth/accept-invite  — token validation only (read-only)
 *   POST /api/auth/set-password   — sets password, activates agent, marks invite accepted
 *
 * Core regression: accept-invite must NOT return 409 when invite.agent_id is set
 * (the pre-creation pattern used by invite-pilot). 409 should only fire on accepted_at.
 */

jest.mock('@/lib/db', () => {
  const mockDb = {
    from: jest.fn(),
    rpc: jest.fn(),
  }

  return {
    postgrestAdmin: mockDb,
    supabaseAdmin: mockDb,
  }
})

import { POST as acceptInvite } from '@/app/api/auth/accept-invite/route'
import { POST as setPassword } from '@/app/api/auth/set-password/route'
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { postgrestAdmin } from '@/lib/db'

const mockDb = postgrestAdmin as jest.Mocked<typeof postgrestAdmin>

function makeRequest(body: object): NextRequest {
  return {
    json: async () => body,
    headers: new Map(),
  } as unknown as NextRequest
}

function makeChainWith(finalValue: unknown) {
  const chain: Record<string, jest.Mock | ((resolve: (v: unknown) => unknown) => Promise<unknown>)> = {}
  const terminalMethods = ['single', 'maybeSingle']
  const chainMethods = ['select', 'eq', 'neq', 'is', 'insert', 'update', 'delete', 'upsert']

  chainMethods.forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain)
  })
  terminalMethods.forEach(m => {
    chain[m] = jest.fn().mockResolvedValue(finalValue)
  })
  // Support direct await (no .single())
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(finalValue).then(resolve)
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /api/auth/accept-invite — token validation', () => {
  it('returns 400 for missing token', async () => {
    const res = await acceptInvite(makeRequest({}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Missing invite token')
  })

  it('returns 404 when invite not found', async () => {
    mockDb.from = jest.fn().mockReturnValue(makeChainWith({ data: null, error: { message: 'not found' } }))
    const res = await acceptInvite(makeRequest({ token: 'unknowntoken123' }))
    expect(res.status).toBe(404)
  })

  it('returns 200 with agentName/email for a valid pending invite with no agent_id', async () => {
    const invite = {
      id: 'inv-1',
      email: 'agent@example.com',
      name: 'John Smith',
      status: 'pending',
      agent_id: null,
      accepted_at: null,
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
    mockDb.from = jest.fn().mockReturnValue(makeChainWith({ data: invite, error: null }))

    const res = await acceptInvite(makeRequest({ token: 'somerawtoken' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.agentName).toBe('John Smith')
    expect(data.email).toBe('agent@example.com')
    expect(data.agentId).toBeUndefined()
  })

  it('returns 200 (not 409) for a valid pending invite WITH agent_id pre-set', async () => {
    // This is the regression test — invite-pilot always sets agent_id.
    // The old code returned 409 here. The fix: 409 only fires on accepted_at.
    const invite = {
      id: 'inv-2',
      email: 'prebuilt@example.com',
      name: 'Pre Built',
      status: 'pending',
      agent_id: 'agent-uuid-123',   // pre-created by invite-pilot
      accepted_at: null,             // NOT yet accepted
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
    mockDb.from = jest.fn().mockReturnValue(makeChainWith({ data: invite, error: null }))

    const res = await acceptInvite(makeRequest({ token: 'somerawtoken' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.agentName).toBe('Pre Built')
    expect(data.agentId).toBe('agent-uuid-123')
  })

  it('returns 409 when accepted_at is set (already accepted)', async () => {
    const invite = {
      id: 'inv-3',
      email: 'done@example.com',
      name: 'Done User',
      status: 'accepted',
      agent_id: 'agent-uuid-done',
      accepted_at: new Date().toISOString(),
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
    mockDb.from = jest.fn().mockReturnValue(makeChainWith({ data: invite, error: null }))

    const res = await acceptInvite(makeRequest({ token: 'somerawtoken' }))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toContain('already been accepted')
  })

  it('returns 410 for an expired invite', async () => {
    const expiredInvite = {
      id: 'inv-4',
      email: 'expired@example.com',
      name: 'Expired User',
      status: 'pending',
      agent_id: null,
      accepted_at: null,
      token_expires_at: new Date(Date.now() - 1000).toISOString(), // past
    }
    const updateChain = makeChainWith({ data: null, error: null })
    const inviteChain = makeChainWith({ data: expiredInvite, error: null })

    mockDb.from = jest.fn()
      .mockReturnValueOnce(inviteChain)  // lookup
      .mockReturnValueOnce(updateChain)  // update to 'expired'

    const res = await acceptInvite(makeRequest({ token: 'somerawtoken' }))
    expect(res.status).toBe(410)
    const data = await res.json()
    expect(data.error).toContain('expired')
  })
})

describe('POST /api/auth/set-password', () => {
  it('returns 400 for missing token', async () => {
    const res = await setPassword(makeRequest({ password: 'validpass123' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for password shorter than 8 characters', async () => {
    const res = await setPassword(makeRequest({ token: 'abc', password: 'short' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('8 characters')
  })

  it('returns 404 when invite not found', async () => {
    mockDb.from = jest.fn().mockReturnValue(makeChainWith({ data: null, error: { message: 'not found' } }))
    const res = await setPassword(makeRequest({ token: 'unknown', password: 'validpass123' }))
    expect(res.status).toBe(404)
  })

  it('returns 409 when invite already accepted', async () => {
    const invite = {
      id: 'inv-done',
      email: 'done@example.com',
      name: 'Done',
      status: 'accepted',
      agent_id: 'agent-done',
      accepted_at: new Date().toISOString(),
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
    mockDb.from = jest.fn().mockReturnValue(makeChainWith({ data: invite, error: null }))
    const res = await setPassword(makeRequest({ token: 'sometoken', password: 'validpass123' }))
    expect(res.status).toBe(409)
  })

  it('returns 410 for expired invite', async () => {
    const invite = {
      id: 'inv-exp',
      email: 'exp@example.com',
      name: 'Exp User',
      status: 'pending',
      agent_id: null,
      accepted_at: null,
      token_expires_at: new Date(Date.now() - 1000).toISOString(),
    }
    const updateChain = makeChainWith({ data: null, error: null })
    const inviteChain = makeChainWith({ data: invite, error: null })

    mockDb.from = jest.fn()
      .mockReturnValueOnce(inviteChain)
      .mockReturnValueOnce(updateChain)

    const res = await setPassword(makeRequest({ token: 'sometoken', password: 'validpass123' }))
    expect(res.status).toBe(410)
  })

  it('updates pre-created agent password and marks invite accepted', async () => {
    const agentId = crypto.randomUUID()
    const invite = {
      id: 'inv-ok',
      email: 'newagent@example.com',
      name: 'New Agent',
      status: 'pending',
      agent_id: agentId,
      accepted_at: null,
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const agentUpdateChain = makeChainWith({ data: null, error: null })
    const inviteUpdateChain = makeChainWith({ data: null, error: null })
    const progressChain = makeChainWith({ data: null, error: null })
    const inviteLookupChain = makeChainWith({ data: invite, error: null })

    mockDb.from = jest.fn()
      .mockReturnValueOnce(inviteLookupChain) // pilot_invites lookup
      .mockReturnValueOnce(agentUpdateChain)  // real_estate_agents update
      .mockReturnValueOnce(inviteUpdateChain) // pilot_invites update
      .mockReturnValueOnce(progressChain)     // pilot_progress insert

    const res = await setPassword(makeRequest({ token: 'sometoken', password: 'ValidPass123' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.agentId).toBe(agentId)

    // Verify it updated agent (not insert)
    const fromCalls = (mockDb.from as jest.Mock).mock.calls
    const agentCall = fromCalls.find(([table]: [string]) => table === 'real_estate_agents')
    expect(agentCall).toBeTruthy()
    // Verify it set accepted_at on the invite
    const inviteUpdateCall = fromCalls.filter(([table]: [string]) => table === 'pilot_invites')
    expect(inviteUpdateCall.length).toBeGreaterThanOrEqual(2)
  })

  it('creates new agent when invite has no pre-created agent_id', async () => {
    const invite = {
      id: 'inv-nocreate',
      email: 'fromold@example.com',
      name: 'Old Style',
      status: 'pending',
      agent_id: null,
      accepted_at: null,
      token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const agentInsertChain = makeChainWith({ data: null, error: null })
    const inviteUpdateChain = makeChainWith({ data: null, error: null })
    const progressChain = makeChainWith({ data: null, error: null })
    const inviteLookupChain = makeChainWith({ data: invite, error: null })

    mockDb.from = jest.fn()
      .mockReturnValueOnce(inviteLookupChain)
      .mockReturnValueOnce(agentInsertChain)
      .mockReturnValueOnce(inviteUpdateChain)
      .mockReturnValueOnce(progressChain)

    const res = await setPassword(makeRequest({ token: 'sometoken', password: 'ValidPass123' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.agentId).toBeTruthy()
  })
})
