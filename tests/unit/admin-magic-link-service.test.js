'use strict';

/**
 * Unit tests for AdminMagicLinkService
 *
 * Required env: none (uses in-process mocks only, no DB or network calls)
 * Run: node tests/unit/admin-magic-link-service.test.js
 */

const assert = require('assert');
// Resolve jsonwebtoken from the live checkout when running in a worktree
const jwt = require('/Users/clawdbot/projects/leadflow/node_modules/jsonwebtoken');

let AdminMagicLinkService;
try {
  AdminMagicLinkService = require('../../lib/services/AdminMagicLinkService');
} catch (_) {
  AdminMagicLinkService = require('/Users/clawdbot/projects/leadflow/lib/services/AdminMagicLinkService');
}

const TEST_SECRET = 'test-jwt-secret-for-unit-tests-only';
const TEST_APP_URL = 'https://test.leadflow.example';

let passed = 0, failed = 0;

function pass(label) { passed++; console.log(`  ✅ ${label}`); }
function fail(label, reason) { failed++; console.error(`  ❌ ${label}: ${reason}`); }

function mockPool(selectRows = [], writeRows = null) {
  let callCount = 0;
  return {
    query: async (_sql, _params) => {
      callCount++;
      if (callCount === 1) return { rows: selectRows };
      return { rows: writeRows || selectRows };
    },
  };
}

async function main() {
  // ─── validateInput ───────────────────────────────────────────────────────────

  console.log('\n[validateInput]');

  try {
    const svc = new AdminMagicLinkService({ pool: mockPool(), jwtSecret: TEST_SECRET, appUrl: TEST_APP_URL });
    const out = svc.validateInput({ email: '  Test@EXAMPLE.COM ', firstName: 'Alice', lastName: 'Smith' });
    assert.strictEqual(out.email, 'test@example.com', 'email should be lowercased and trimmed');
    assert.strictEqual(out.firstName, 'Alice');
    assert.strictEqual(out.lastName, 'Smith');
    pass('normalises email to lowercase trimmed');
  } catch (e) {
    fail('normalises email to lowercase trimmed', e.message);
  }

  try {
    const svc = new AdminMagicLinkService({ pool: mockPool(), jwtSecret: TEST_SECRET, appUrl: TEST_APP_URL });
    svc.validateInput({ email: 'not-an-email', firstName: 'A', lastName: 'B' });
    fail('rejects invalid email', 'should have thrown');
  } catch (e) {
    if (e.statusCode === 400) pass('rejects invalid email with 400');
    else fail('rejects invalid email', `unexpected: ${e.message}`);
  }

  try {
    const svc = new AdminMagicLinkService({ pool: mockPool(), jwtSecret: TEST_SECRET, appUrl: TEST_APP_URL });
    svc.validateInput({ email: 'a@b.com', firstName: '', lastName: 'B' });
    fail('rejects missing firstName', 'should have thrown');
  } catch (e) {
    if (e.statusCode === 400) pass('rejects missing firstName with 400');
    else fail('rejects missing firstName', `unexpected: ${e.message}`);
  }

  try {
    const svc = new AdminMagicLinkService({ pool: mockPool(), jwtSecret: TEST_SECRET, appUrl: TEST_APP_URL });
    svc.validateInput({ email: 'a@b.com', firstName: 'A', lastName: '' });
    fail('rejects missing lastName', 'should have thrown');
  } catch (e) {
    if (e.statusCode === 400) pass('rejects missing lastName with 400');
    else fail('rejects missing lastName', `unexpected: ${e.message}`);
  }

  // ─── signTrialActivationToken ────────────────────────────────────────────────

  console.log('\n[signTrialActivationToken]');

  try {
    const svc = new AdminMagicLinkService({ pool: mockPool(), jwtSecret: null, appUrl: TEST_APP_URL });
    svc.signTrialActivationToken({ id: 'ag1', email: 'a@b.com' });
    fail('throws 503 when jwtSecret is null', 'should have thrown');
  } catch (e) {
    if (e.statusCode === 503) pass('throws 503 when jwtSecret is null');
    else fail('throws 503 when jwtSecret is null', `unexpected: ${e.message}`);
  }

  try {
    const svc = new AdminMagicLinkService({ pool: mockPool(), jwtSecret: TEST_SECRET, appUrl: TEST_APP_URL });
    const token = svc.signTrialActivationToken({ id: 'agent-123', email: 'user@example.com' });
    assert.strictEqual(typeof token, 'string', 'token must be a string');
    assert.strictEqual(token.split('.').length, 3, 'token must have 3 JWT parts');
    pass('produces a 3-part JWT string');
  } catch (e) {
    fail('produces a 3-part JWT string', e.message);
  }

  try {
    const svc = new AdminMagicLinkService({ pool: mockPool(), jwtSecret: TEST_SECRET, appUrl: TEST_APP_URL });
    const token = svc.signTrialActivationToken({ id: 'agent-456', email: 'agent@test.com' });

    // Verify using jsonwebtoken — confirms the standard library accepts our tokens
    const decoded = jwt.verify(token, TEST_SECRET, {
      algorithms: ['HS256'],
      issuer: 'leadflow-admin-magic-link',
    });
    assert.strictEqual(decoded.agentId, 'agent-456', 'agentId must match');
    assert.strictEqual(decoded.email, 'agent@test.com', 'email must match');
    assert.strictEqual(decoded.purpose, 'trial-activation', 'purpose must be trial-activation');
    assert.strictEqual(decoded.iss, 'leadflow-admin-magic-link', 'issuer must match');
    assert.ok(decoded.exp > decoded.iat, 'exp must be after iat');
    pass('token verifiable by jsonwebtoken with correct claims');
  } catch (e) {
    fail('token verifiable by jsonwebtoken with correct claims', e.message);
  }

  try {
    const svc = new AdminMagicLinkService({ pool: mockPool(), jwtSecret: TEST_SECRET, appUrl: TEST_APP_URL });
    const token = svc.signTrialActivationToken({ id: 'ag', email: 'x@y.com' });
    assert.throws(
      () => jwt.verify(token, 'wrong-secret', { algorithms: ['HS256'] }),
      /invalid signature/i
    );
    pass('token rejected by jsonwebtoken when secret is wrong');
  } catch (e) {
    fail('token rejected by jsonwebtoken when secret is wrong', e.message);
  }

  // ─── createMagicLink (DB integration stub) ───────────────────────────────────

  console.log('\n[createMagicLink]');

  try {
    const agentRow = { id: 'ag999', email: 'mg@test.com', first_name: 'Mo', last_name: 'G' };
    const pool = {
      query: async (sql, _params) => {
        if (sql.trim().startsWith('SELECT')) return { rows: [] };
        return { rows: [agentRow] };
      },
    };
    const svc = new AdminMagicLinkService({ pool, jwtSecret: TEST_SECRET, appUrl: TEST_APP_URL });
    const result = await svc.createMagicLink({ email: 'mg@test.com', firstName: 'Mo', lastName: 'G' });
    assert.ok(result.loginUrl.startsWith(`${TEST_APP_URL}/accept-invite?token=`), 'loginUrl must start with appUrl + path');
    assert.ok(result.expiresAt, 'expiresAt must be present');
    const token = decodeURIComponent(result.loginUrl.split('token=')[1]);
    const decoded = jwt.verify(token, TEST_SECRET, { algorithms: ['HS256'], issuer: 'leadflow-admin-magic-link' });
    assert.strictEqual(decoded.purpose, 'trial-activation');
    pass('createMagicLink returns loginUrl with verifiable JWT');
  } catch (e) {
    fail('createMagicLink returns loginUrl with verifiable JWT', e.message);
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('\n❌ Tests FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
