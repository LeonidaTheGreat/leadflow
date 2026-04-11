'use strict';

/**
 * Unit tests for ActivationService
 * Tests admin auth, activation list retrieval, and activation email sending.
 */

const assert = require('assert');
const ActivationService = require('../../lib/services/ActivationService');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`  FAIL: ${name}: ${error.message}`);
    failed++;
  }
}

/** Minimal mock pool builder */
function makePool(rows = [], opts = {}) {
  const queries = [];
  return {
    queries,
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (opts.throws) throw new Error(opts.throws);
      // Return different rows based on call order if multiple sets provided
      const callIdx = queries.length - 1;
      if (Array.isArray(rows[0])) {
        return { rows: rows[callIdx] || [] };
      }
      return { rows };
    },
  };
}

async function run() {
  console.log('\n=== unit: ActivationService class ===\n');

  // ── verifyAdminAuth ───────────────────────────────────────────────────────

  await check('verifyAdminAuth returns false when apiKey not set', async () => {
    const svc = new ActivationService({ apiKey: '' });
    const req = { headers: { authorization: 'Bearer somekey' } };
    assert.strictEqual(svc.verifyAdminAuth(req), false);
  });

  await check('verifyAdminAuth returns false when no Authorization header', async () => {
    const svc = new ActivationService({ apiKey: 'secret' });
    const req = { headers: {} };
    assert.strictEqual(svc.verifyAdminAuth(req), false);
  });

  await check('verifyAdminAuth returns false when header does not start with Bearer', async () => {
    const svc = new ActivationService({ apiKey: 'secret' });
    const req = { headers: { authorization: 'Basic secret' } };
    assert.strictEqual(svc.verifyAdminAuth(req), false);
  });

  await check('verifyAdminAuth returns false when token does not match', async () => {
    const svc = new ActivationService({ apiKey: 'secret' });
    const req = { headers: { authorization: 'Bearer wrong' } };
    assert.strictEqual(svc.verifyAdminAuth(req), false);
  });

  await check('verifyAdminAuth returns true when token matches', async () => {
    const svc = new ActivationService({ apiKey: 'mysecret' });
    const req = { headers: { authorization: 'Bearer mysecret' } };
    assert.strictEqual(svc.verifyAdminAuth(req), true);
  });

  await check('verifyAdminAuth trims whitespace from provided token', async () => {
    const svc = new ActivationService({ apiKey: 'mysecret' });
    const req = { headers: { authorization: 'Bearer mysecret  ' } };
    assert.strictEqual(svc.verifyAdminAuth(req), true);
  });

  // ── getActivationList ─────────────────────────────────────────────────────

  await check('getActivationList throws when pool not configured', async () => {
    const svc = new ActivationService({});
    try {
      await svc.getActivationList();
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok(err.message.includes('not configured'));
    }
  });

  await check('getActivationList returns rows from pool query', async () => {
    const mockRows = [
      { id: 'a1', email: 'a@test.com', first_name: 'Alice', activation_email_sent: false },
      { id: 'a2', email: 'b@test.com', first_name: 'Bob', activation_email_sent: true },
    ];
    const pool = makePool(mockRows);
    const svc = new ActivationService({ pool });
    const rows = await svc.getActivationList();
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].email, 'a@test.com');
  });

  await check('getActivationList queries for verified, non-onboarded agents', async () => {
    const pool = makePool([]);
    const svc = new ActivationService({ pool });
    await svc.getActivationList();
    const { sql } = pool.queries[0];
    assert.ok(sql.includes('email_verified = true'), 'Must filter verified agents');
    assert.ok(sql.includes('onboarding_completed = false'), 'Must filter non-onboarded agents');
  });

  // ── sendActivationEmail ───────────────────────────────────────────────────

  await check('sendActivationEmail throws when pool not configured', async () => {
    const svc = new ActivationService({});
    try {
      await svc.sendActivationEmail('some-uuid');
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok(err.message.includes('not configured'));
    }
  });

  await check('sendActivationEmail returns Agent not found for empty rows', async () => {
    const pool = makePool([]);
    const svc = new ActivationService({ pool });
    const result = await svc.sendActivationEmail('missing-uuid');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Agent not found');
  });

  await check('sendActivationEmail returns error for unverified email', async () => {
    const pool = makePool([{ id: 'a1', email: 'x@test.com', first_name: 'X', email_verified: false, onboarding_completed: false }]);
    const svc = new ActivationService({ pool });
    const result = await svc.sendActivationEmail('a1');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Agent email is not verified');
  });

  await check('sendActivationEmail returns error when onboarding already completed', async () => {
    const pool = makePool([{ id: 'a1', email: 'x@test.com', first_name: 'X', email_verified: true, onboarding_completed: true }]);
    const svc = new ActivationService({ pool });
    const result = await svc.sendActivationEmail('a1');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Agent has already completed onboarding');
  });

  await check('sendActivationEmail returns Email send failed when EmailService fails', async () => {
    const pool = makePool([
      [{ id: 'a1', email: 'x@test.com', first_name: 'Alice', email_verified: true, onboarding_completed: false }],
      [], // second call (mark sent) — never reached in failure case
    ]);
    const mockEmailService = {
      sendActivationOutreach: async () => ({ success: false, error: 'Resend API 429' }),
    };
    const svc = new ActivationService({ pool, emailService: mockEmailService });
    const result = await svc.sendActivationEmail('a1');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Email send failed');
    assert.strictEqual(result.detail, 'Resend API 429');
  });

  await check('sendActivationEmail does NOT update DB on email failure', async () => {
    const pool = makePool([
      [{ id: 'a1', email: 'x@test.com', first_name: 'Alice', email_verified: true, onboarding_completed: false }],
    ]);
    const mockEmailService = {
      sendActivationOutreach: async () => ({ success: false, error: 'network error' }),
    };
    const svc = new ActivationService({ pool, emailService: mockEmailService });
    await svc.sendActivationEmail('a1');
    // Only 1 query (the SELECT), not 2 (no UPDATE)
    assert.strictEqual(pool.queries.length, 1, 'Must not write to DB on email failure');
  });

  await check('sendActivationEmail returns success with agent_id, email, resend_id', async () => {
    const pool = makePool([
      [{ id: 'a1', email: 'alice@test.com', first_name: 'Alice', email_verified: true, onboarding_completed: false }],
      [], // UPDATE query
    ]);
    const mockEmailService = {
      sendActivationOutreach: async () => ({ success: true, resend_id: 're_abc123' }),
    };
    const svc = new ActivationService({ pool, emailService: mockEmailService });
    const result = await svc.sendActivationEmail('a1');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.agent_id, 'a1');
    assert.strictEqual(result.email, 'alice@test.com');
    assert.strictEqual(result.resend_id, 're_abc123');
  });

  await check('sendActivationEmail marks activation_email_sent = true AFTER successful send', async () => {
    const pool = makePool([
      [{ id: 'a1', email: 'alice@test.com', first_name: 'Alice', email_verified: true, onboarding_completed: false }],
      [],
    ]);
    const mockEmailService = {
      sendActivationOutreach: async () => ({ success: true, resend_id: 're_xyz' }),
    };
    const svc = new ActivationService({ pool, emailService: mockEmailService });
    await svc.sendActivationEmail('a1');
    // Second query should be the UPDATE
    assert.strictEqual(pool.queries.length, 2, 'Must run SELECT then UPDATE');
    assert.ok(pool.queries[1].sql.includes('activation_email_sent = true'), 'Second query must mark sent');
    assert.deepStrictEqual(pool.queries[1].params, ['a1'], 'UPDATE must use agent_id param');
  });

  await check('sendActivationEmail passes correct subject to EmailService', async () => {
    const pool = makePool([
      [{ id: 'a1', email: 'alice@test.com', first_name: 'Alice', email_verified: true, onboarding_completed: false }],
      [],
    ]);
    let capturedParams = null;
    const mockEmailService = {
      sendActivationOutreach: async (params) => {
        capturedParams = params;
        return { success: true, resend_id: 're_x' };
      },
    };
    const svc = new ActivationService({ pool, emailService: mockEmailService });
    await svc.sendActivationEmail('a1');
    assert.ok(capturedParams.subject.includes('Your LeadFlow setup'), 'Subject must match AC');
    assert.strictEqual(capturedParams.to, 'alice@test.com');
    assert.strictEqual(capturedParams.firstName, 'Alice');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
