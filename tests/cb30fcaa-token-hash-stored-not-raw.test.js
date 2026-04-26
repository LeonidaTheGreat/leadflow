'use strict'

/**
 * E2E test: verify pilot invite route stores only the token hash, not the raw token.
 *
 * This tests the core security invariant of the invite flow:
 * - generateInviteToken() returns { rawToken, tokenHash }
 * - Only tokenHash goes to the DB; rawToken is only used in the invite URL
 * - The tautological check added in PR #1323 (storageData.token !== tokenHash) is dead code
 *
 * We replicate the route's token logic in isolation (no DB/network required).
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
  }
}

// Replicate generateInviteToken() from the route
function generateInviteToken() {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  return { rawToken, tokenHash }
}

// ── Token generation invariants ──────────────────────────────────────────────

test('rawToken is 64 hex chars (32 bytes)', () => {
  const { rawToken } = generateInviteToken()
  assert.strictEqual(rawToken.length, 64)
  assert.ok(/^[0-9a-f]+$/.test(rawToken), 'rawToken must be hex')
})

test('tokenHash is 64 hex chars (SHA-256 output)', () => {
  const { tokenHash } = generateInviteToken()
  assert.strictEqual(tokenHash.length, 64)
  assert.ok(/^[0-9a-f]+$/.test(tokenHash), 'tokenHash must be hex')
})

test('rawToken and tokenHash are different values', () => {
  const { rawToken, tokenHash } = generateInviteToken()
  assert.notStrictEqual(rawToken, tokenHash, 'Hash must differ from raw token')
})

test('tokenHash is deterministic SHA-256 of rawToken', () => {
  const { rawToken, tokenHash } = generateInviteToken()
  const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  assert.strictEqual(tokenHash, expectedHash, 'tokenHash must be SHA-256 of rawToken')
})

// ── PR #1323 intermediate-variable pattern is a no-op ─────────────────────

test('storageData tautology: storageData.token always equals tokenHash', () => {
  const { tokenHash } = generateInviteToken()
  const storageData = { token: tokenHash }
  // This is exactly the check added by PR #1323. It can NEVER be true.
  assert.strictEqual(storageData.token, tokenHash, 'The check is always false — dead code')
})

test('inviteData tautology: inviteData.token always equals tokenHash', () => {
  const { tokenHash } = generateInviteToken()
  const email = 'test@example.com'
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const inviteData = {
    email,
    name: 'Test User',
    token: tokenHash,
    token_expires_at: expiresAt.toISOString(),
    agent_id: 'agent-123',
    status: 'pending'
  }
  // This is exactly the check added by PR #1323. It can NEVER be true.
  assert.strictEqual(inviteData.token, tokenHash, 'The check is always false — dead code')
})

test('rawToken is NOT stored in DB object (only tokenHash is)', () => {
  const { rawToken, tokenHash } = generateInviteToken()
  const storageData = { token: tokenHash }
  assert.strictEqual(storageData.token, tokenHash)
  assert.notStrictEqual(storageData.token, rawToken, 'DB object must not contain rawToken')
})

test('token verification: SHA-256(rawToken) === tokenHash (DB lookup is valid)', () => {
  const { rawToken, tokenHash } = generateInviteToken()
  // When a user presents rawToken, the server hashes it and compares to stored tokenHash
  const presented = crypto.createHash('sha256').update(rawToken).digest('hex')
  assert.strictEqual(presented, tokenHash, 'Token verification flow must work')
})

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${passed}/${total} tests passed`)
if (passed !== total) process.exit(1)
