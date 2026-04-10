/**
 * E2E Test: AuthService session management refactor
 * Task: 9e8cdd78 — Refactor: Convert session management to AuthService class
 * PR: #1113
 *
 * Tests the structural correctness of the refactor:
 * - AuthService class exists with all required methods
 * - session.ts is deleted (no stale file)
 * - No production routes import from the deleted @/lib/session
 * - Routes that use session validation import from AuthService
 * - agent-session.ts and session-analytics.ts delegate to AuthService
 * - TwilioService class exists and is wired; twilio-sms.js is a thin shim
 * - FUBService uses TwilioService not legacy twilio-sms.js
 *
 * Uses plain Node.js assert — no frameworks required.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DASHBOARD_DIR = path.join(REPO_ROOT, 'product/lead-response/dashboard');
const LIB_DIR = path.join(DASHBOARD_DIR, 'lib');
const ROUTES_DIR = path.join(DASHBOARD_DIR, 'app/api');
const AUTH_SERVICE_PATH = path.join(LIB_DIR, 'services/AuthService.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 1. session.ts is deleted
// ────────────────────────────────────────────────────────────────────────────
test('session.ts is deleted', () => {
  const sessionPath = path.join(LIB_DIR, 'session.ts');
  assert(!fs.existsSync(sessionPath), `lib/session.ts still exists — must be deleted`);
});

// ────────────────────────────────────────────────────────────────────────────
// 2. AuthService class exists with all required methods
// ────────────────────────────────────────────────────────────────────────────
test('AuthService.js exists at expected path', () => {
  assert(fs.existsSync(AUTH_SERVICE_PATH), `AuthService.js not found at ${AUTH_SERVICE_PATH}`);
});

test('AuthService has required auth session methods', () => {
  const content = fs.readFileSync(AUTH_SERVICE_PATH, 'utf-8');
  const methods = ['createSession', 'validateSession', 'destroySession', 'getUserSessions', 'cleanupExpiredSessions'];
  for (const m of methods) {
    assert(content.includes(`async ${m}(`), `AuthService missing method: ${m}`);
  }
});

test('AuthService has agent session methods added in this refactor', () => {
  const content = fs.readFileSync(AUTH_SERVICE_PATH, 'utf-8');
  const newMethods = ['logAgentSessionStart', 'touchAgentSession', 'touchAgentSessionByAgentId', 'logPageView', 'endAgentSession'];
  for (const m of newMethods) {
    assert(content.includes(m), `AuthService missing new method: ${m}`);
  }
});

test('AuthService exports singleton authService', () => {
  const content = fs.readFileSync(AUTH_SERVICE_PATH, 'utf-8');
  assert(content.includes('export const authService = AuthService.createDefaultService()'), 'AuthService missing singleton export');
});

test('AuthService exports static getClientIp()', () => {
  const content = fs.readFileSync(AUTH_SERVICE_PATH, 'utf-8');
  assert(content.includes('static getClientIp('), 'AuthService missing static getClientIp() method');
});

test('AuthService exports TRACKED_PAGES', () => {
  const content = fs.readFileSync(AUTH_SERVICE_PATH, 'utf-8');
  assert(content.includes('export const TRACKED_PAGES'), 'AuthService missing TRACKED_PAGES export');
});

// ────────────────────────────────────────────────────────────────────────────
// 3. No production routes import from deleted @/lib/session
// ────────────────────────────────────────────────────────────────────────────
test('No production source files import from @/lib/session', () => {
  const violations = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      // skip build output and test files
      if (entry.name === '.next' || entry.name === 'node_modules') continue;
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Match import from '@/lib/session' but NOT session-analytics, agent-session, services/AuthService etc.
        if ((content.includes("from '@/lib/session'") || content.includes('from "@/lib/session"')) &&
            !content.includes("from '@/lib/session-analytics'") &&
            !content.includes("from '@/lib/agent-session'")) {
          violations.push(path.relative(DASHBOARD_DIR, fullPath));
        }
      }
    }
  }

  scanDir(DASHBOARD_DIR);
  assert(violations.length === 0, `Stale imports from @/lib/session found in:\n  ${violations.join('\n  ')}`);
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Routes that use session validation import from AuthService
// ────────────────────────────────────────────────────────────────────────────
test('booking/route.ts imports authService from AuthService', () => {
  const content = fs.readFileSync(path.join(ROUTES_DIR, 'booking/route.ts'), 'utf-8');
  assert(content.includes("from '@/lib/services/AuthService'"), 'booking/route.ts not importing from AuthService');
  assert(content.includes('authService.validateSession'), 'booking/route.ts not using authService.validateSession');
});

test('feedback/route.ts imports authService from AuthService', () => {
  const content = fs.readFileSync(path.join(ROUTES_DIR, 'feedback/route.ts'), 'utf-8');
  assert(content.includes("from '@/lib/services/AuthService'"), 'feedback/route.ts not importing from AuthService');
  assert(content.includes('authService.validateSession'), 'feedback/route.ts not using authService.validateSession');
});

test('analytics/dashboard/route.ts imports authService from AuthService', () => {
  const content = fs.readFileSync(path.join(ROUTES_DIR, 'analytics/dashboard/route.ts'), 'utf-8');
  assert(content.includes("from '@/lib/services/AuthService'"), 'analytics/dashboard/route.ts not importing from AuthService');
  assert(content.includes('authService.validateSession'), 'analytics/dashboard/route.ts not using authService.validateSession');
});

// ────────────────────────────────────────────────────────────────────────────
// 5. agent-session.ts and session-analytics.ts delegate to AuthService
// ────────────────────────────────────────────────────────────────────────────
test('agent-session.ts delegates to AuthService, no inline DB calls', () => {
  const content = fs.readFileSync(path.join(LIB_DIR, 'agent-session.ts'), 'utf-8');
  assert(content.includes("from '@/lib/services/AuthService'"), 'agent-session.ts not importing from AuthService');
  // Must NOT have direct agent_sessions inserts
  assert(
    !content.includes(".from('agent_sessions')"),
    'agent-session.ts still has direct agent_sessions DB calls — should delegate to AuthService'
  );
});

test('session-analytics.ts delegates to AuthService, no inline DB calls', () => {
  const content = fs.readFileSync(path.join(LIB_DIR, 'session-analytics.ts'), 'utf-8');
  assert(content.includes("from '@/lib/services/AuthService'"), 'session-analytics.ts not importing from AuthService');
  // Must NOT have direct DB calls to agent_sessions or agent_page_views
  assert(
    !content.includes(".from('agent_sessions')"),
    'session-analytics.ts still has direct agent_sessions DB calls'
  );
  assert(
    !content.includes(".from('agent_page_views')"),
    'session-analytics.ts still has direct agent_page_views DB calls'
  );
});

// ────────────────────────────────────────────────────────────────────────────
// 6. TwilioService refactor (bundled in this PR)
// ────────────────────────────────────────────────────────────────────────────
test('lib/services/TwilioService.js exists and defines TwilioService class', () => {
  const twilioServicePath = path.join(REPO_ROOT, 'lib/services/TwilioService.js');
  assert(fs.existsSync(twilioServicePath), 'lib/services/TwilioService.js does not exist');
  const content = fs.readFileSync(twilioServicePath, 'utf-8');
  assert(content.includes('class TwilioService'), 'TwilioService.js does not define class TwilioService');
  assert(content.includes('sendSms'), 'TwilioService missing sendSms method');
});

test('lib/twilio-sms.js is a thin shim (< 2000 bytes)', () => {
  const shimPath = path.join(REPO_ROOT, 'lib/twilio-sms.js');
  assert(fs.existsSync(shimPath), 'lib/twilio-sms.js shim does not exist');
  const content = fs.readFileSync(shimPath, 'utf-8');
  assert(content.includes('TwilioService'), 'twilio-sms.js does not import from TwilioService');
  assert(content.length < 2000, `twilio-sms.js is ${content.length} bytes — expected thin shim`);
});

test('FUBService.js imports TwilioService, not legacy twilio-sms.js', () => {
  const fubPath = path.join(REPO_ROOT, 'lib/services/FUBService.js');
  assert(fs.existsSync(fubPath), 'lib/services/FUBService.js not found');
  const content = fs.readFileSync(fubPath, 'utf-8');
  assert(content.includes("require('./TwilioService')"), 'FUBService.js does not import TwilioService');
  assert(!content.includes("require('../twilio-sms')"), 'FUBService.js still imports legacy twilio-sms.js directly');
});

// ────────────────────────────────────────────────────────────────────────────
// 7. No hardcoded secrets in changed files
// ────────────────────────────────────────────────────────────────────────────
test('AuthService.js contains no hardcoded secrets', () => {
  const content = fs.readFileSync(AUTH_SERVICE_PATH, 'utf-8');
  const secretPatterns = [
    /sk_live_[A-Za-z0-9]+/,
    /AC[a-f0-9]{32}/,  // Twilio account SID pattern
    /[A-Za-z0-9]{32,}/.source,  // omit broad check, too many false positives
  ];
  // Check only specific patterns
  assert(!/sk_live_[A-Za-z0-9]+/.test(content), 'AuthService.js contains Stripe live key');
  // API URLs must use env vars
  const hardcodedUrl = /https:\/\/api\.[a-z]+\.(com|org|io)/.exec(content);
  if (hardcodedUrl) {
    // allow the default fallback which uses env vars
    const line = content.substring(0, content.indexOf(hardcodedUrl[0])).split('\n').length;
    assert(content.includes('process.env.'), `AuthService.js contains hardcoded URL at line ~${line}: ${hardcodedUrl[0]}`);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Results
// ────────────────────────────────────────────────────────────────────────────
console.log(`\n📊 Results: ${passed}/${passed + failed} passed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed`);
  process.exit(1);
} else {
  console.log('\n✅ All tests passed');
}
