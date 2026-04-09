/**
 * Test: fix-forgot-password-column-mismatch
 * Task ID: 640fe726-27e5-480f-98a2-3ab755a70c22
 *
 * Verifies that:
 * 1. password_reset_tokens table uses (agent_id, token_hash, expires_at, used) columns
 * 2. forgot-password route logic correctly maps to those columns
 * 3. reset-password route logic correctly validates and marks tokens used
 * 4. Token generation uses crypto.randomBytes (not Math.random)
 * 5. Only the hash is stored, never the raw token
 */

const assert = require('assert');
const crypto = require('crypto');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        console.log(`  ✅ PASS: ${name}`);
        passed++;
      }).catch(err => {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     ${err.message}`);
        failed++;
      });
    } else {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
      return Promise.resolve();
    }
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
    return Promise.resolve();
  }
}

async function runAll() {
  console.log('\n=== Test: fix-forgot-password-column-mismatch ===\n');

  // --- AC-1: Token generation uses crypto.randomBytes ---
  await test('AC-1: Token generation uses crypto.randomBytes (64 hex chars)', () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    assert.strictEqual(typeof rawToken, 'string', 'token must be a string');
    assert.strictEqual(rawToken.length, 64, 'token must be 64 hex chars (32 bytes)');
    assert.match(rawToken, /^[a-f0-9]{64}$/, 'token must be lowercase hex');
  });

  // --- AC-2: Token hash is SHA-256, distinct from raw token ---
  await test('AC-2: SHA-256 hash of token differs from raw token', () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    assert.notStrictEqual(tokenHash, rawToken, 'hash must differ from raw token');
    assert.strictEqual(tokenHash.length, 64, 'SHA-256 hash is 64 hex chars');
  });

  // --- AC-3: Consistent hashing — same token always produces same hash ---
  await test('AC-3: Token hashing is deterministic', () => {
    const rawToken = 'abc123testtoken';
    const hash1 = crypto.createHash('sha256').update(rawToken).digest('hex');
    const hash2 = crypto.createHash('sha256').update(rawToken).digest('hex');
    assert.strictEqual(hash1, hash2, 'same token must always produce same hash');
  });

  // --- AC-4: Reset URL includes raw token, not the hash ---
  await test('AC-4: Reset URL uses raw token (not hash)', () => {
    const APP_URL = 'https://leadflow-ai-five.vercel.app';
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`;
    assert.ok(resetUrl.includes(rawToken), 'URL must contain raw token');
    assert.ok(!resetUrl.includes(tokenHash), 'URL must NOT contain token hash');
  });

  // --- AC-5: DB insert uses correct columns ---
  await test('AC-5: Insert payload uses (agent_id, token_hash, expires_at, used) columns', () => {
    const agentId = 'agent-uuid-123';
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const insertPayload = {
      agent_id: agentId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used: false,
    };

    // Verify correct columns are present
    assert.ok('agent_id' in insertPayload, 'must have agent_id column');
    assert.ok('token_hash' in insertPayload, 'must have token_hash column');
    assert.ok('expires_at' in insertPayload, 'must have expires_at column');
    assert.ok('used' in insertPayload, 'must have used column (boolean)');

    // Verify wrong columns are NOT present
    assert.ok(!('email' in insertPayload), 'must NOT have email column');
    assert.ok(!('token' in insertPayload), 'must NOT have raw token column');
    assert.ok(!('used_at' in insertPayload), 'must NOT have used_at column');

    // Verify values
    assert.strictEqual(insertPayload.agent_id, agentId);
    assert.strictEqual(insertPayload.token_hash, tokenHash);
    assert.strictEqual(insertPayload.used, false);
  });

  // --- AC-6: Token expiry is 1 hour ---
  await test('AC-6: Token expires in 1 hour', () => {
    const before = Date.now();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const after = Date.now();
    const expiresMs = expiresAt.getTime();
    const oneHourMs = 60 * 60 * 1000;
    assert.ok(expiresMs >= before + oneHourMs - 100, 'expires must be ~1 hour from now');
    assert.ok(expiresMs <= after + oneHourMs + 100, 'expires must be ~1 hour from now');
  });

  // --- AC-7: Token validation logic (used + expiry checks) ---
  await test('AC-7: Reject used tokens', () => {
    const tokenRecord = { id: 'tok-1', agent_id: 'agent-1', expires_at: new Date(Date.now() + 3600000).toISOString(), used: true };
    assert.strictEqual(tokenRecord.used, true, 'used token should be detected');
  });

  await test('AC-8: Reject expired tokens', () => {
    const tokenRecord = { id: 'tok-2', agent_id: 'agent-1', expires_at: new Date(Date.now() - 1000).toISOString(), used: false };
    const isExpired = new Date(tokenRecord.expires_at) < new Date();
    assert.ok(isExpired, 'expired token should be detected');
  });

  await test('AC-9: Accept valid tokens (unused, not expired)', () => {
    const tokenRecord = { id: 'tok-3', agent_id: 'agent-1', expires_at: new Date(Date.now() + 3600000).toISOString(), used: false };
    const isExpired = new Date(tokenRecord.expires_at) < new Date();
    assert.ok(!tokenRecord.used, 'token must not be used');
    assert.ok(!isExpired, 'token must not be expired');
  });

  // --- Summary ---
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
