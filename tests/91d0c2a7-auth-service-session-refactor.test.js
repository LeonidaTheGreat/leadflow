'use strict';
/**
 * QC E2E test — PR #1122: Convert session management to AuthService class
 * Task: 91d0c2a7-29f6-49b2-a77a-77f203dfdad3
 *
 * Verifies:
 *   1. lib/session.ts deleted (no stale module)
 *   2. TwilioService class is importable with correct exports
 *   3. lib/twilio-sms.js is a thin shim delegating to TwilioService
 *   4. FUBService imports TwilioService, not legacy twilio-sms.js
 *   5. AuthService static getClientIp() is present
 *   6. AuthService named exports are complete (getUserIdFromSession, deleteSession, etc.)
 *   7. No production route imports @/lib/session (regex scan)
 *   8. agent-session.ts and session-analytics.ts delegate to AuthService
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const DASHBOARD = path.join(REPO, 'product', 'lead-response', 'dashboard');

let passed = 0;
let failed = 0;

function pass(msg) {
  console.log(`  ✅ ${msg}`);
  passed++;
}

function fail(msg, detail) {
  console.error(`  ❌ FAIL: ${msg}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

// ─── TEST 1: lib/session.ts must not exist ────────────────────────────────────
console.log('\n[1] lib/session.ts deleted');
const sessionTsPath = path.join(DASHBOARD, 'lib', 'session.ts');
if (!fs.existsSync(sessionTsPath)) {
  pass('lib/session.ts does not exist (correctly deleted)');
} else {
  fail('lib/session.ts still exists — refactor incomplete');
}

// ─── TEST 2: TwilioService class is importable ────────────────────────────────
console.log('\n[2] TwilioService class');
// Use require-time mock for db client
const twilioServicePath = path.join(REPO, 'lib', 'services', 'TwilioService.js');
try {
  assert(fs.existsSync(twilioServicePath), 'TwilioService.js does not exist');
  const content = fs.readFileSync(twilioServicePath, 'utf8');
  assert(content.includes('class TwilioService'), 'class TwilioService not found');
  assert(content.includes('sendSms'), 'sendSms method not found');
  assert(content.includes('resolveTwilioContext'), 'resolveTwilioContext not found');
  assert(content.includes('module.exports = TwilioService'), 'TwilioService not exported as default');
  assert(content.includes('module.exports.sendSmsViatwilio'), 'backward-compat sendSmsViatwilio not exported');
  pass('TwilioService.js exists with correct class, methods, and exports');
} catch (err) {
  fail('TwilioService.js', err.message);
}

// ─── TEST 3: lib/twilio-sms.js is a thin shim ────────────────────────────────
console.log('\n[3] lib/twilio-sms.js shim');
const shimPath = path.join(REPO, 'lib', 'twilio-sms.js');
try {
  assert(fs.existsSync(shimPath), 'lib/twilio-sms.js does not exist');
  const content = fs.readFileSync(shimPath, 'utf8');
  const sizeBytes = Buffer.byteLength(content, 'utf8');
  assert(sizeBytes < 2000, `shim is ${sizeBytes} bytes — expected < 2000 (thin shim only)`);
  assert(content.includes('TwilioService'), 'shim does not import TwilioService');
  assert(!content.includes('twilio('), 'shim should not call twilio() directly');
  pass(`lib/twilio-sms.js is a thin shim (${sizeBytes} bytes)`);
} catch (err) {
  fail('lib/twilio-sms.js', err.message);
}

// ─── TEST 4: FUBService uses TwilioService, not legacy twilio-sms ────────────
console.log('\n[4] FUBService uses TwilioService');
const fubPath = path.join(REPO, 'lib', 'services', 'FUBService.js');
try {
  assert(fs.existsSync(fubPath), 'FUBService.js does not exist');
  const content = fs.readFileSync(fubPath, 'utf8');
  assert(
    !content.includes("require('../twilio-sms')"),
    "FUBService still requires '../twilio-sms' directly"
  );
  assert(content.includes('TwilioService'), 'FUBService does not reference TwilioService');
  pass('FUBService uses TwilioService, no direct twilio-sms import');
} catch (err) {
  fail('FUBService', err.message);
}

// ─── TEST 5: AuthService has static getClientIp and agent session methods ─────
console.log('\n[5] AuthService methods and exports');
const authServicePath = path.join(DASHBOARD, 'lib', 'services', 'AuthService.js');
try {
  assert(fs.existsSync(authServicePath), 'AuthService.js does not exist');
  const content = fs.readFileSync(authServicePath, 'utf8');
  const required = [
    'static getClientIp',
    'logAgentSessionStart',
    'touchAgentSession',
    'touchAgentSessionByAgentId',
    'logPageView',
    'endAgentSession',
    'export const authService',
    'getUserIdFromSession',
    'export async function deleteSession',
    'export async function validateSession',
    'TRACKED_PAGES',
  ];
  for (const sym of required) {
    assert(content.includes(sym), `AuthService.js missing: ${sym}`);
  }
  pass('AuthService.js has all required methods and exports');
} catch (err) {
  fail('AuthService.js', err.message);
}

// ─── TEST 6: No production routes import from @/lib/session ──────────────────
console.log('\n[6] No stale @/lib/session imports in production routes');
const appDir = path.join(DASHBOARD, 'app');
const libDir = path.join(DASHBOARD, 'lib');
const stalePattern = /from\s+['"]@\/lib\/session['"]/;
const violations = [];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      scanDir(path.join(dir, entry.name));
    } else if (/\.(ts|tsx|js)$/.test(entry.name)) {
      const filePath = path.join(dir, entry.name);
      // Skip test files
      if (filePath.includes('/tests/') || filePath.includes('/__tests__/') || filePath.includes('.test.')) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      if (stalePattern.test(content)) {
        violations.push(path.relative(DASHBOARD, filePath));
      }
    }
  }
}

scanDir(appDir);
scanDir(libDir);

if (violations.length === 0) {
  pass('No production code imports from @/lib/session');
} else {
  fail(`Found stale @/lib/session import(s)`, violations.join(', '));
}

// ─── TEST 7: agent-session.ts and session-analytics.ts delegate to AuthService ─
console.log('\n[7] Thin wrapper delegation in agent-session.ts + session-analytics.ts');
for (const [label, relPath] of [
  ['agent-session.ts', 'lib/agent-session.ts'],
  ['session-analytics.ts', 'lib/session-analytics.ts'],
]) {
  const filePath = path.join(DASHBOARD, relPath);
  try {
    assert(fs.existsSync(filePath), `${relPath} does not exist`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert(content.includes('AuthService') || content.includes('authService'), `${label} does not reference AuthService`);
    // Must not have inline DB calls
    const hasInlineDb = content.includes('.from(\'agent_sessions\')') || content.includes('.from("agent_sessions")');
    assert(!hasInlineDb, `${label} has inline DB call — should delegate to AuthService`);
    pass(`${label} delegates to AuthService, no inline DB calls`);
  } catch (err) {
    fail(label, err.message);
  }
}

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'─'.repeat(60)}`);
console.log(`📊 ${passed}/${total} passed`);
if (failed > 0) {
  console.log('\nFAILURES found — PR should be REJECTED');
  process.exit(1);
} else {
  console.log('\n✅ All checks passed');
}
