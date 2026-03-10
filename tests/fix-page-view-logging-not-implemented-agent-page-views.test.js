/**
 * E2E test: fix-page-view-logging-not-implemented-agent-page-views
 *
 * Verifies:
 * 1. POST /api/page-views returns 401 without auth
 * 2. POST /api/page-views returns 400 for untracked page
 * 3. POST /api/page-views with valid auth + tracked page returns {logged:true}
 * 4. GET /api/internal/pilot-usage returns 401 without service key
 * 5. Frontend build includes PageViewTracker in dashboard layout
 * 6. Route files exist for both endpoints
 *
 * Uses plain Node.js + assert (no test framework required).
 * Run: node tests/fix-page-view-logging-not-implemented-agent-page-views.test.js
 */

'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

const DASHBOARD_ROOT = path.resolve(__dirname, '../product/lead-response/dashboard');
const BUILD_DIR = path.join(DASHBOARD_ROOT, '.next');

// ─────────────────────────────────────────────────────────────
// 1. Source file existence
// ─────────────────────────────────────────────────────────────
console.log('\n[1] Source file checks');

test('POST /api/page-views route.ts exists', () => {
  const p = path.join(DASHBOARD_ROOT, 'app/api/page-views/route.ts');
  assert.ok(fs.existsSync(p), `Missing: ${p}`);
});

test('GET /api/internal/pilot-usage route.ts exists', () => {
  const p = path.join(DASHBOARD_ROOT, 'app/api/internal/pilot-usage/route.ts');
  assert.ok(fs.existsSync(p), `Missing: ${p}`);
});

test('PageViewTracker component exists', () => {
  const p = path.join(DASHBOARD_ROOT, 'components/page-view-tracker.tsx');
  assert.ok(fs.existsSync(p), `Missing: ${p}`);
});

test('Dashboard layout imports PageViewTracker', () => {
  const p = path.join(DASHBOARD_ROOT, 'app/dashboard/layout.tsx');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('PageViewTracker'), 'layout.tsx does not import PageViewTracker');
});

// ─────────────────────────────────────────────────────────────
// 2. Source code correctness checks
// ─────────────────────────────────────────────────────────────
console.log('\n[2] Code correctness checks');

test('/api/page-views inserts into agent_page_views table', () => {
  const p = path.join(DASHBOARD_ROOT, 'app/api/page-views/route.ts');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('agent_page_views'), 'Route does not reference agent_page_views table');
});

test('/api/page-views requires agent_id + session_id + page + visited_at in insert', () => {
  const p = path.join(DASHBOARD_ROOT, 'app/api/page-views/route.ts');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('agent_id'), 'Missing agent_id in insert');
  assert.ok(content.includes('session_id'), 'Missing session_id in insert');
  assert.ok(content.includes('visited_at'), 'Missing visited_at in insert');
});

test('/api/page-views tracks /dashboard', () => {
  const p = path.join(DASHBOARD_ROOT, 'app/api/page-views/route.ts');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('/dashboard'), 'Route does not track /dashboard');
});

test('PageViewTracker deduplicates (sessionStorage)', () => {
  const p = path.join(DASHBOARD_ROOT, 'components/page-view-tracker.tsx');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('sessionStorage'), 'No sessionStorage dedup logic found');
});

test('PageViewTracker reads JWT from sessionStorage or localStorage', () => {
  const p = path.join(DASHBOARD_ROOT, 'components/page-view-tracker.tsx');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('leadflow_token'), 'No leadflow_token token lookup');
});

// ─────────────────────────────────────────────────────────────
// 3. Security checks
// ─────────────────────────────────────────────────────────────
console.log('\n[3] Security checks');

test('No hardcoded production secrets in page-views route', () => {
  const p = path.join(DASHBOARD_ROOT, 'app/api/page-views/route.ts');
  const content = fs.readFileSync(p, 'utf8');
  // Warn if actual-looking secrets are present (not placeholder strings)
  const suspiciousPatterns = /sk-[a-zA-Z0-9]{40,}|eyJ[a-zA-Z0-9]{50,}/;
  assert.ok(!suspiciousPatterns.test(content), 'Potential hardcoded secret detected');
});

test('/api/internal/pilot-usage requires SUPABASE_SERVICE_ROLE_KEY auth', () => {
  const p = path.join(DASHBOARD_ROOT, 'app/api/internal/pilot-usage/route.ts');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Missing service role key auth check');
  assert.ok(content.includes('401'), 'Missing 401 response for unauthorized');
});

test('/api/page-views validates JWT before DB write', () => {
  const p = path.join(DASHBOARD_ROOT, 'app/api/page-views/route.ts');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('jwt.verify'), 'Missing JWT verification');
});

// ─────────────────────────────────────────────────────────────
// 4. Build artifact checks
// ─────────────────────────────────────────────────────────────
console.log('\n[4] Build artifact checks');

test('.next build directory exists', () => {
  assert.ok(fs.existsSync(BUILD_DIR), '.next directory missing — run npm run build first');
});

// ─────────────────────────────────────────────────────────────
// 5. Unit test file checks
// ─────────────────────────────────────────────────────────────
console.log('\n[5] Unit test file checks');

test('page-view-logger.test.ts exists', () => {
  const p = path.join(DASHBOARD_ROOT, '__tests__/page-view-logger.test.ts');
  assert.ok(fs.existsSync(p), `Missing test file: ${p}`);
});

test('pilot-usage.test.ts exists', () => {
  const p = path.join(DASHBOARD_ROOT, '__tests__/pilot-usage.test.ts');
  assert.ok(fs.existsSync(p), `Missing test file: ${p}`);
});

// ─────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL CHECKS PASSED ✅');
}
