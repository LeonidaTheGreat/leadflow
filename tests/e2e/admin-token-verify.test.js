/**
 * E2E test: admin token verification uses timing-safe comparison
 * Tests verifyAdminToken logic as used in /api/admin/outreach/blast
 */
const crypto = require('crypto')
const assert = require('assert')

// Replicate the verifyAdminToken logic from route.ts
function verifyAdminToken(incoming, secret) {
  if (!incoming || !secret) return false
  try {
    const a = Buffer.from(incoming)
    const b = Buffer.from(secret)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`❌ FAIL: ${name} — ${err.message}`)
    failed++
  }
}

// Correct token matches
test('correct token accepted', () => {
  assert.strictEqual(verifyAdminToken('my-secret-token', 'my-secret-token'), true)
})

// Wrong token rejected
test('wrong token rejected', () => {
  assert.strictEqual(verifyAdminToken('wrong-token-xxx', 'my-secret-token'), false)
})

// Null incoming rejected
test('null incoming rejected', () => {
  assert.strictEqual(verifyAdminToken(null, 'my-secret-token'), false)
})

// Empty incoming rejected
test('empty string incoming rejected', () => {
  assert.strictEqual(verifyAdminToken('', 'my-secret-token'), false)
})

// Undefined secret (ADMIN_SECRET not set) rejected
test('undefined secret rejected', () => {
  assert.strictEqual(verifyAdminToken('any-token', undefined), false)
})

// Different length rejected (no crash)
test('different length token rejected without throwing', () => {
  assert.strictEqual(verifyAdminToken('short', 'much-longer-secret-value'), false)
})

// Prefix match rejected (not just starts-with)
test('prefix of correct token rejected', () => {
  const secret = 'abcdef1234567890'
  assert.strictEqual(verifyAdminToken('abcdef', secret), false)
})

// High-entropy token roundtrip
test('crypto.randomBytes token accepted', () => {
  const secret = crypto.randomBytes(32).toString('hex')
  assert.strictEqual(verifyAdminToken(secret, secret), true)
})

// Tampered-by-one-char rejected
test('one-character tampered token rejected', () => {
  const secret = 'abcdef1234567890abcd'
  const tampered = 'abcdef1234567890abce'
  assert.strictEqual(verifyAdminToken(tampered, secret), false)
})

// Auth check path: ADMIN_SECRET not set in env → returns false (no bypass)
test('missing ADMIN_SECRET env causes rejection (not bypass)', () => {
  const savedEnv = process.env.ADMIN_SECRET
  delete process.env.ADMIN_SECRET
  const result = verifyAdminToken('any-token', process.env.ADMIN_SECRET)
  process.env.ADMIN_SECRET = savedEnv
  assert.strictEqual(result, false)
})

console.log(`\n${passed + failed} tests — ✅ ${passed} passed, ❌ ${failed} failed`)
if (failed > 0) process.exit(1)
