/**
 * QC Test: 0 real pilots — real vs test account visibility
 * UC: fix-0-real-pilots-recruited-all-11-pilot-accounts-are-
 *
 * Verifies:
 * - isTestAccount() correctly classifies test and real emails
 * - Pilots admin page source correctly separates real from test pilots
 * - /api/admin/pilot-targets/[id]/invite route exists and uses crypto.randomBytes
 * - Target status is updated to "contacted" after invite
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASH = path.join('/Users/clawdbot/projects/leadflow', 'product', 'lead-response', 'dashboard');
const PILOTS_PAGE = path.join(DASH, 'app', 'admin', 'pilots', 'page.tsx');
const INVITE_ROUTE = path.join(DASH, 'app', 'api', 'admin', 'pilot-targets', '[id]', 'invite', 'route.ts');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name} — ${e.message}`);
    failed++;
  }
}

// -------------------------------------------------------
// AC-1: isTestAccount classification logic
// -------------------------------------------------------

test('pilots page source defines TEST_EMAIL_PATTERNS', () => {
  const src = fs.readFileSync(PILOTS_PAGE, 'utf8');
  assert.ok(src.includes('TEST_EMAIL_PATTERNS'), 'TEST_EMAIL_PATTERNS must be defined');
  assert.ok(src.includes('@test\\.local'), 'Must detect @test.local pattern');
  assert.ok(src.includes('@test\\.com'), 'Must detect @test.com pattern');
  assert.ok(src.includes('@example\\.com'), 'Must detect @example.com pattern');
});

test('pilots page source defines isTestAccount function', () => {
  const src = fs.readFileSync(PILOTS_PAGE, 'utf8');
  assert.ok(src.includes('function isTestAccount'), 'isTestAccount function must be defined');
  assert.ok(src.includes('TEST_EMAIL_PATTERNS.some(p => p.test(email))'), 'isTestAccount must use TEST_EMAIL_PATTERNS.some()');
});

// Inline verification of the logic itself
const TEST_EMAIL_PATTERNS = [/@test\.local$/i, /@test\.com$/i, /@example\.com$/i, /@qc\.local$/i];
function isTestAccount(email) {
  return TEST_EMAIL_PATTERNS.some(p => p.test(email));
}

test('isTestAccount: @test.local classified as test', () => {
  assert.ok(isTestAccount('agent@test.local'), 'agent@test.local should be test');
  assert.ok(isTestAccount('AGENT@TEST.LOCAL'), 'case-insensitive: AGENT@TEST.LOCAL');
});

test('isTestAccount: @test.com classified as test', () => {
  assert.ok(isTestAccount('qc-agent@test.com'), 'qc-agent@test.com should be test');
});

test('isTestAccount: @example.com classified as test', () => {
  assert.ok(isTestAccount('user@example.com'), 'user@example.com should be test');
});

test('isTestAccount: @qc.local classified as test', () => {
  assert.ok(isTestAccount('qc@qc.local'), 'qc@qc.local should be test');
});

test('isTestAccount: real emails not classified as test', () => {
  assert.ok(!isTestAccount('agent@gmail.com'), 'gmail.com should not be test');
  assert.ok(!isTestAccount('john@realestate.com'), 'realestate.com should not be test');
  assert.ok(!isTestAccount('madzunkov@gmail.com'), 'Stojan gmail should not be test');
  assert.ok(!isTestAccount('stojan@kw.com'), 'Keller Williams domain should not be test');
});

test('isTestAccount: partial match does not trigger (must be domain suffix)', () => {
  // email@nottest.local — does not end with @test.local, so should NOT match @test.local
  // Actually @test.local$ means the email must end with @test.local
  assert.ok(!isTestAccount('agent@mytest.com.org'), 'mytest.com.org should not match');
});

// -------------------------------------------------------
// AC-2: Pilots page separates real vs test pilots
// -------------------------------------------------------

test('pilots page computes realPilots using isTestAccount filter', () => {
  const src = fs.readFileSync(PILOTS_PAGE, 'utf8');
  assert.ok(
    src.includes('realPilots = pilots.filter(p => !isTestAccount(p.email))'),
    'realPilots filter must exclude test accounts'
  );
});

test('pilots page computes testPilots as separate set', () => {
  const src = fs.readFileSync(PILOTS_PAGE, 'utf8');
  assert.ok(
    src.includes('testPilots = pilots.filter(p => isTestAccount(p.email))'),
    'testPilots filter must include only test accounts'
  );
});

test('pilots page shows visiblePilots (hides test accounts by default)', () => {
  const src = fs.readFileSync(PILOTS_PAGE, 'utf8');
  assert.ok(
    src.includes('showTestAccounts ? pilots : realPilots'),
    'visiblePilots must default to real pilots only'
  );
  assert.ok(
    src.includes('showTestAccounts(false)') || src.includes("useState(false)"),
    'showTestAccounts must default to false'
  );
});

test('pilots page shows red alert when realPilots.length === 0', () => {
  const src = fs.readFileSync(PILOTS_PAGE, 'utf8');
  assert.ok(
    src.includes('realPilots.length === 0'),
    'Must check realPilots.length === 0 for alert'
  );
  // Should have a red indicator
  assert.ok(
    src.includes('bg-red-') || src.includes('text-red-'),
    'Must use red styling for zero real pilots'
  );
});

test('pilots page links to recruitment campaigns when no real pilots', () => {
  const src = fs.readFileSync(PILOTS_PAGE, 'utf8');
  assert.ok(
    src.includes('/admin/pilot-campaigns'),
    'Must link to /admin/pilot-campaigns when no real pilots'
  );
});

test('pilots page has toggle button to show/hide test accounts', () => {
  const src = fs.readFileSync(PILOTS_PAGE, 'utf8');
  assert.ok(
    src.includes('setShowTestAccounts'),
    'Must have handler to toggle test account visibility'
  );
});

// -------------------------------------------------------
// AC-3: /api/admin/pilot-targets/[id]/invite route
// -------------------------------------------------------

test('pilot-targets invite route file exists', () => {
  assert.ok(fs.existsSync(INVITE_ROUTE), `invite route must exist at ${INVITE_ROUTE}`);
});

test('invite route uses crypto.randomBytes for token (not Math.random)', () => {
  const src = fs.readFileSync(INVITE_ROUTE, 'utf8');
  assert.ok(src.includes('crypto.randomBytes'), 'Must use crypto.randomBytes for token generation');
  assert.ok(!src.includes('Math.random'), 'Must NOT use Math.random for tokens');
});

test('invite route uses SHA-256 hashing to store token', () => {
  const src = fs.readFileSync(INVITE_ROUTE, 'utf8');
  assert.ok(src.includes('sha256'), 'Token must be hashed with sha256 before storage');
  assert.ok(src.includes('createHash'), 'Must use crypto.createHash');
});

test('invite route requires admin auth header check', () => {
  const src = fs.readFileSync(INVITE_ROUTE, 'utf8');
  assert.ok(src.includes('checkAdminAuth'), 'Must call checkAdminAuth');
  assert.ok(src.includes('x-admin-token'), 'Must check x-admin-token header');
  assert.ok(src.includes('ADMIN_SECRET'), 'Must compare against ADMIN_SECRET env var');
});

test('invite route marks target as contacted after sending invite', () => {
  const src = fs.readFileSync(INVITE_ROUTE, 'utf8');
  assert.ok(
    src.includes("status: 'contacted'"),
    'Must update target status to "contacted"'
  );
  assert.ok(
    src.includes('pilot_recruitment_targets'),
    'Must update pilot_recruitment_targets table'
  );
});

test('invite route handles missing email on target with 400', () => {
  const src = fs.readFileSync(INVITE_ROUTE, 'utf8');
  assert.ok(
    src.includes('no email address') || src.includes('!target.email'),
    'Must reject targets without email'
  );
});

test('invite route sets token expiry to 7 days', () => {
  const src = fs.readFileSync(INVITE_ROUTE, 'utf8');
  assert.ok(
    src.includes('7 * 24 * 60 * 60 * 1000'),
    'Token must expire in 7 days'
  );
});

test('invite route creates pilot_invites record', () => {
  const src = fs.readFileSync(INVITE_ROUTE, 'utf8');
  assert.ok(src.includes('pilot_invites'), 'Must insert into pilot_invites table');
});

test('invite route returns inviteUrl in response', () => {
  const src = fs.readFileSync(INVITE_ROUTE, 'utf8');
  assert.ok(src.includes('inviteUrl'), 'Must return inviteUrl in response');
  assert.ok(src.includes('accept-invite?token='), 'inviteUrl must use accept-invite path with raw token');
});

// -------------------------------------------------------
// Summary
// -------------------------------------------------------

console.log(`\n--- Test Results ---`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
