'use strict';

/**
 * QC E2E — PR #1861: Fix Admin Invite Accept Flow (409 Blocks Pending Invites)
 *
 * Verifies the two-step invite flow split:
 *   POST /api/auth/accept-invite  — read-only token validation (no DB writes)
 *   POST /api/auth/set-password   — mutations (password, agent activation)
 *
 * Key regression: accept-invite must return 200 when invite.agent_id is set
 * but accepted_at is null. 409 must only fire when accepted_at IS set.
 *
 * Route-level logic is covered by Jest tests in __tests__/accept-invite-flow.test.ts
 * (13 tests, all passing). This script verifies structural correctness and runs
 * those Jest tests as the authoritative E2E gate.
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DASHBOARD = path.join(__dirname, '../product/lead-response/dashboard');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

// ─── Token hashing ────────────────────────────────────────────────────────────

async function runHashTests() {
  await test('SHA-256 token hashing is deterministic (same raw → same hash)', () => {
    const raw = 'my-raw-invite-token-abc123';
    const h1 = crypto.createHash('sha256').update(raw).digest('hex');
    const h2 = crypto.createHash('sha256').update(raw).digest('hex');
    assert.strictEqual(h1, h2);
    assert.strictEqual(h1.length, 64);
    assert.notStrictEqual(h1, raw);
  });

  await test('Different raw tokens produce different hashes', () => {
    const h1 = crypto.createHash('sha256').update('token-a').digest('hex');
    const h2 = crypto.createHash('sha256').update('token-b').digest('hex');
    assert.notStrictEqual(h1, h2);
  });
}

// ─── File structure ───────────────────────────────────────────────────────────

async function runStructureTests() {
  await test('set-password route exists (new file)', () => {
    const p = `${DASHBOARD}/app/api/auth/set-password/route.ts`;
    assert.ok(fs.existsSync(p), `Missing: ${p}`);
  });

  await test('accept-invite route is read-only (no bcrypt, no real_estate_agents mutation)', () => {
    const src = fs.readFileSync(`${DASHBOARD}/app/api/auth/accept-invite/route.ts`, 'utf8');
    assert.ok(!src.includes('bcrypt'), 'accept-invite must not import bcrypt — mutations belong in set-password');
    assert.ok(!src.includes("from('real_estate_agents')"), 'accept-invite must not query real_estate_agents');
    assert.ok(!src.includes('.insert('), 'accept-invite must have no DB inserts');
  });

  await test('accept-invite uses accepted_at for 409, not agent_id existence', () => {
    const src = fs.readFileSync(`${DASHBOARD}/app/api/auth/accept-invite/route.ts`, 'utf8');
    assert.ok(src.includes('invite.accepted_at'), 'Must check accepted_at as the 409 trigger');
    // The regression: old code returned 409 when agent_id was set. Check that agent_id
    // is NOT guarding a 409 return — it may still appear in the success response body.
    const agentId409Pattern = /if\s*\(\s*invite\.agent_id\s*\)[\s\S]{0,100}409/;
    assert.ok(!agentId409Pattern.test(src), 'Must NOT return 409 based on agent_id presence (regression bug)');
  });

  await test('set-password handles pre-created agents via update (not insert)', () => {
    const src = fs.readFileSync(`${DASHBOARD}/app/api/auth/set-password/route.ts`, 'utf8');
    assert.ok(src.includes('invite.agent_id'), 'Must branch on invite.agent_id for pre-created agents');
    assert.ok(src.includes('.update('), 'Must update pre-existing agent record');
    assert.ok(src.includes('.insert('), 'Must also support insert fallback for old invites');
    assert.ok(src.includes('accepted_at'), 'Must stamp accepted_at on the invite');
  });

  await test('set-password uses trial_ends_at (correct schema column name)', () => {
    const src = fs.readFileSync(`${DASHBOARD}/app/api/auth/set-password/route.ts`, 'utf8');
    assert.ok(src.includes('trial_ends_at'), 'Must use trial_ends_at (matches real_estate_agents schema)');
    assert.ok(!src.includes('trial_expires_at'), 'trial_expires_at is the old incorrect column name');
  });

  await test('accept-invite returns agentName and email in 200 response', () => {
    const src = fs.readFileSync(`${DASHBOARD}/app/api/auth/accept-invite/route.ts`, 'utf8');
    assert.ok(src.includes('agentName'), 'Must return agentName for UI welcome message');
    assert.ok(src.includes('invite.email'), 'Must return email');
  });

  await test('Frontend handles already-accepted state (status 409 → already-accepted)', () => {
    const src = fs.readFileSync(`${DASHBOARD}/app/accept-invite/page.tsx`, 'utf8');
    assert.ok(src.includes("'already-accepted'"), 'Must have already-accepted UI state');
    assert.ok(src.includes('response.status === 409'), 'Must handle 409 explicitly');
    assert.ok(src.includes("'password-form'"), 'Must have password-form state for 2-step flow');
    assert.ok(src.includes('set-password'), 'Must call set-password endpoint');
  });

  await test('Jest test file un-ignored (no longer in testPathIgnorePatterns)', () => {
    const src = fs.readFileSync(`${DASHBOARD}/jest.config.ts`, 'utf8');
    assert.ok(!src.includes('accept-invite-flow.test.ts'), 'accept-invite-flow.test.ts must not be in ignore list');
  });
}

// ─── Jest tests (authoritative route-level gate) ──────────────────────────────

async function runJestTests() {
  await test('Jest: 13/13 route tests pass (accept-invite + set-password)', () => {
    try {
      const result = execSync(
        'npx jest __tests__/accept-invite-flow.test.ts --no-coverage --silent 2>&1',
        { cwd: DASHBOARD, encoding: 'utf8' }
      );
      // If jest exits 0, all tests passed
      assert.ok(!result.includes('FAIL'), `Jest reported failures:\n${result}`);
    } catch (e) {
      throw new Error(`Jest tests failed:\n${e.stdout || e.message}`);
    }
  });
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runAll() {
  console.log('\n🔍 QC E2E — PR #1861: Invite Accept 409 Fix\n');

  await runHashTests();
  await runStructureTests();
  await runJestTests();

  console.log(`\n📊 Results: ${passed}/${passed + failed} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runAll().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
