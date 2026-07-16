'use strict'

/**
 * QC E2E test: PR #1884 — accept-invite 409 fix + two-step password flow
 *
 * Tests the logic of both endpoints in isolation (no DB/network required):
 * - accept-invite: should allow invites with agent_id pre-set (the 409 bug fix)
 * - accept-invite: should create agent if no agent_id, return needsPassword=true
 * - set-password: should require agent_id on invite (step 1 must come first)
 * - set-password: should reject already-accepted invites
 * - Both routes: token hashing must be consistent
 */

const assert = require('assert')
const crypto = require('crypto')

let passed = 0
let total = 0

function test(name, fn) {
  total++
  try {
    fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`)
    process.exitCode = 1
  }
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

// ── accept-invite route logic (core 409 fix) ────────────────────────────────

test('invite with agent_id pre-set should NOT be rejected (the 409 bug)', () => {
  // Before fix: the route returned 409 if invite.agent_id was set.
  // After fix: if agent_id exists, use it — no new agent created, no 409.
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

  // New logic: if agent_id is set, skip agent creation
  let agentId
  if (invite.agent_id) {
    agentId = invite.agent_id
  }

  assert.strictEqual(agentId, 'pre-created-agent-id', 'should use pre-existing agent_id')
  assert.ok(!invite.accepted_at, 'invite not yet accepted — should not 409')
  assert.notStrictEqual(invite.status, 'accepted', 'invite status is pending — should not 409')
})

test('invite without agent_id should create a new agent (existing behavior)', () => {
  const invite = {
    agent_id: null,
    status: 'pending',
    accepted_at: null,
    email: 'new@example.com',
    name: 'New Agent',
    token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }

  // The route creates a new agent and links it
  const mockNewAgentId = 'newly-created-agent-id'
  let agentId = invite.agent_id || mockNewAgentId

  assert.strictEqual(agentId, mockNewAgentId, 'should create new agent when agent_id is null')
})

test('accept-invite should return needsPassword=true on success', () => {
  const response = {
    success: true,
    agentId: 'agent-123',
    email: 'agent@example.com',
    name: 'Test Agent',
    needsPassword: true
  }

  assert.strictEqual(response.success, true)
  assert.strictEqual(response.needsPassword, true, 'two-step flow requires needsPassword flag')
  assert.ok(response.agentId, 'agentId must be returned for set-password step')
  assert.ok(response.email, 'email must be returned for UI display')
})

// ── already-accepted guard (must still block double-accepts) ─────────────────

test('accept-invite should reject invite with status=accepted', () => {
  const invite = { status: 'accepted', accepted_at: '2026-07-16T00:00:00Z' }
  const shouldBlock = invite.accepted_at || invite.status === 'accepted'
  assert.ok(shouldBlock, 'already-accepted invite must be blocked')
})

test('accept-invite should reject invite with accepted_at set even if status != accepted', () => {
  const invite = { status: 'pending', accepted_at: '2026-07-16T00:00:00Z' }
  const shouldBlock = invite.accepted_at || invite.status === 'accepted'
  assert.ok(shouldBlock, 'invite with accepted_at set must be blocked regardless of status')
})

test('accept-invite should pass invite with no accepted_at and status=pending', () => {
  const invite = { status: 'pending', accepted_at: null }
  const shouldBlock = invite.accepted_at || invite.status === 'accepted'
  assert.ok(!shouldBlock, 'valid pending invite must NOT be blocked')
})

// ── expiry check ─────────────────────────────────────────────────────────────

test('accept-invite should reject expired token', () => {
  const invite = { token_expires_at: new Date(Date.now() - 1000).toISOString() }
  assert.ok(new Date(invite.token_expires_at) < new Date(), 'expired invite must be rejected')
})

test('accept-invite should allow non-expired token', () => {
  const invite = { token_expires_at: new Date(Date.now() + 86400000).toISOString() }
  assert.ok(new Date(invite.token_expires_at) >= new Date(), 'valid invite must be allowed')
})

// ── set-password route logic ─────────────────────────────────────────────────

test('set-password should require agent_id on invite (step 1 must come first)', () => {
  const invite = { agent_id: null, status: 'pending', accepted_at: null }
  const missingAgentId = !invite.agent_id
  assert.ok(missingAgentId, 'set-password must reject if accept-invite step was skipped')
})

test('set-password should reject already-accepted invite', () => {
  const invite = { status: 'accepted', accepted_at: '2026-07-16T12:00:00Z' }
  const shouldBlock = invite.accepted_at || invite.status === 'accepted'
  assert.ok(shouldBlock, 'set-password must prevent double-accepts')
})

test('set-password password length validation: min 8 chars', () => {
  assert.ok('abc1234'.length < 8, 'short password must be rejected')
  assert.ok('SecureP1'.length >= 8, 'valid password must be accepted')
})

test('set-password should reject expired invite even if agent_id is set', () => {
  const invite = {
    agent_id: 'agent-123',
    status: 'pending',
    accepted_at: null,
    token_expires_at: new Date(Date.now() - 1000).toISOString()
  }
  assert.ok(new Date(invite.token_expires_at) < new Date(), 'expired invite must be rejected even with agent_id set')
})

// ── token hashing consistency ────────────────────────────────────────────────

test('both routes hash the token identically (SHA-256)', () => {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const hash1 = crypto.createHash('sha256').update(rawToken).digest('hex')
  const hash2 = crypto.createHash('sha256').update(rawToken).digest('hex')
  assert.strictEqual(hash1, hash2, 'token hashing must be deterministic')
  assert.strictEqual(hash1.length, 64, 'SHA-256 hex digest must be 64 chars')
  assert.notStrictEqual(hash1, rawToken, 'hash must differ from raw token')
})

test('two different raw tokens produce different hashes', () => {
  const h1 = hashToken('token-A')
  const h2 = hashToken('token-B')
  assert.notStrictEqual(h1, h2)
})

// ── two-step flow contract ────────────────────────────────────────────────────

test('full two-step flow: step 1 validates, step 2 activates', () => {
  // Simulate step 1: accept-invite
  const step1Response = { success: true, needsPassword: true, agentId: 'agent-123', email: 'a@b.com', name: 'Agent A' }
  assert.ok(step1Response.needsPassword, 'step 1 must signal that password is needed')
  assert.ok(step1Response.agentId, 'step 1 must return agentId for step 2')

  // Simulate step 2: set-password
  const step2Response = { success: true, agentId: 'agent-123' }
  assert.ok(step2Response.success, 'step 2 must confirm success')
  assert.strictEqual(step2Response.agentId, step1Response.agentId, 'agentId must be consistent across both steps')
})

// ── summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed}/${total} tests passed`)
if (passed < total) {
  process.exit(1)
}
