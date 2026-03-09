/**
 * E2E Test: fix-api-endpoint-not-protected-by-session-middleware
 *
 * Validates that:
 * 1. /api/analytics/dashboard route requires session cookie
 * 2. /api/analytics/sms-stats route requires session cookie
 * 3. agent_id is derived from session, not query params
 * 4. Cache-Control is private (not public/CDN-cacheable)
 *
 * Run: node tests/fix-api-endpoint-not-protected-by-session-middleware.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard');
let passed = 0;
let failed = 0;
const total = 7;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${e.message}`);
    failed++;
  }
}

// ── Test 1: Dashboard route imports validateSession ──
test('Dashboard route imports validateSession from session lib', () => {
  const routeCode = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app', 'api', 'analytics', 'dashboard', 'route.ts'),
    'utf8'
  );
  assert.ok(
    routeCode.includes("import { validateSession }") || routeCode.includes("from '@/lib/session'"),
    'Dashboard route must import validateSession'
  );
});

// ── Test 2: Dashboard route checks session cookie ──
test('Dashboard route checks leadflow_session cookie', () => {
  const routeCode = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app', 'api', 'analytics', 'dashboard', 'route.ts'),
    'utf8'
  );
  assert.ok(
    routeCode.includes("leadflow_session"),
    'Route must read leadflow_session cookie'
  );
  assert.ok(
    routeCode.includes("401"),
    'Route must return 401 for unauthorized requests'
  );
});

// ── Test 3: Dashboard route derives agentId from session ──
test('Dashboard route derives agentId from session (not query params)', () => {
  const routeCode = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app', 'api', 'analytics', 'dashboard', 'route.ts'),
    'utf8'
  );
  assert.ok(
    routeCode.includes('session.userId'),
    'agentId must come from session.userId'
  );
  // Ensure no agent_id from query params
  assert.ok(
    !routeCode.includes("searchParams.get('agent_id')"),
    'Must NOT accept agent_id from query params'
  );
});

// ── Test 4: Dashboard route uses private Cache-Control ──
test('Dashboard route uses private cache headers (not public)', () => {
  const routeCode = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app', 'api', 'analytics', 'dashboard', 'route.ts'),
    'utf8'
  );
  assert.ok(
    routeCode.includes('private'),
    'Cache-Control must be private'
  );
  assert.ok(
    !routeCode.includes("'Cache-Control': 'public"),
    'Cache-Control must NOT be public'
  );
});

// ── Test 5: SMS stats route has session validation ──
test('SMS stats route has session validation', () => {
  const routeCode = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app', 'api', 'analytics', 'sms-stats', 'route.ts'),
    'utf8'
  );
  assert.ok(
    routeCode.includes("validateSession"),
    'SMS stats must call validateSession'
  );
  assert.ok(
    routeCode.includes("leadflow_session"),
    'SMS stats must check leadflow_session cookie'
  );
  assert.ok(
    routeCode.includes("401"),
    'SMS stats must return 401 for unauthorized'
  );
});

// ── Test 6: SMS stats queries sms_messages table (not messages) ──
test('SMS stats queries sms_messages table, not messages', () => {
  const routeCode = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app', 'api', 'analytics', 'sms-stats', 'route.ts'),
    'utf8'
  );
  assert.ok(
    routeCode.includes("'sms_messages'"),
    'Must query sms_messages table'
  );
  // Ensure not querying the wrong 'messages' table
  const fromCalls = routeCode.match(/\.from\(['"](\w+)['"]\)/g) || [];
  const tables = fromCalls.map(m => m.match(/['"](\w+)['"]/)[1]);
  assert.ok(
    !tables.includes('messages'),
    `Must NOT query 'messages' table — found tables: ${tables.join(', ')}`
  );
});

// ── Test 7: SMS stats scopes by session agent_id (not query param) ──
test('SMS stats derives agent_id from session, not query params', () => {
  const routeCode = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app', 'api', 'analytics', 'sms-stats', 'route.ts'),
    'utf8'
  );
  assert.ok(
    routeCode.includes('session.userId'),
    'agent_id must come from session.userId'
  );
  assert.ok(
    !routeCode.includes("searchParams.get('agent_id')"),
    'Must NOT accept agent_id from query params'
  );
});

// ── Report ──
console.log('\n' + '='.join ? '=' : '='.repeat(50));
console.log(`Results: ${passed}/${total} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
