/**
 * QC E2E Test: PR #1075 — Billing + DB pool consolidation
 * Task: 3f8d92df-c5de-49b1-b467-e993c80339e4
 *
 * PR title: "Refactor: Consolidate calcom into CalcomService class (6→2 files)"
 * Actual PR diff (vs origin/main): billing consolidation + DB pool centralization
 *
 * This test validates:
 * 1. CalcomService — does it exist? (stated PR goal)
 * 2. Billing consolidation — BillingService, old files removed, pg-pool created
 * 3. Route thinness — no inline Stripe/Pool in routes
 */

'use strict';

const path = require('path');
const fs   = require('fs');

const ROOT      = path.resolve(__dirname, '..');
const DASH_ROOT = path.join(ROOT, 'product', 'lead-response', 'dashboard');

let passed = 0;
let failed = 0;

function pass(msg) { console.log('  PASS:', msg); passed++; }
function fail(msg) { console.log('  FAIL:', msg); failed++; }

function fileExists(p)      { return fs.existsSync(p); }
function read(p)            { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function contains(p, pat)   { const c = read(p); return typeof pat==='string' ? c.includes(pat) : pat.test(c); }

console.log('\n=== PR #1075 QC: Billing + DB pool consolidation ===\n');

// ── 1. CalcomService (stated PR goal) ────────────────────────────────────────
console.log('1. CalcomService class (stated goal)');
const calcomServicePath = path.join(ROOT, 'lib', 'services', 'CalcomService.js');
if (fileExists(calcomServicePath)) {
  pass('lib/services/CalcomService.js exists');
  const c = read(calcomServicePath);
  for (const m of ['createBooking','cancelBooking','getEventTypes']) {
    if (new RegExp(`async ${m}\\b|${m}\\s*\\(`).test(c)) pass(`CalcomService.${m} present`);
    else fail(`CalcomService.${m} missing`);
  }
} else {
  fail('lib/services/CalcomService.js does NOT exist — PR goal not met');
  // Partial credit: old calcom lib files should at minimum still be intact (no broken state)
  if (fileExists(path.join(ROOT, 'lib', 'calcom.js'))) {
    pass('lib/calcom.js still intact (calcom not broken, just not refactored)');
  } else {
    fail('lib/calcom.js missing — calcom functionality may be broken');
  }
}

// ── 2. BillingService (actual work delivered) ────────────────────────────────
console.log('\n2. BillingService class');
const bsPath = path.join(ROOT, 'lib', 'services', 'BillingService.js');
if (!fileExists(bsPath)) {
  fail('lib/services/BillingService.js must exist');
} else {
  pass('lib/services/BillingService.js exists');
  const bs = read(bsPath);
  for (const m of ['createCustomer','createSubscription','getSubscriptionStatus','cancelSubscription']) {
    if (new RegExp(`async ${m}\\b`).test(bs)) pass(`BillingService.${m} present`);
    else fail(`BillingService.${m} missing`);
  }
  if (/module\.exports\s*=\s*new BillingService/.test(bs)) pass('BillingService exports singleton');
  else fail('BillingService must export singleton');
  if (/sk_live_[a-zA-Z0-9]{10}/.test(bs)) fail('BillingService has hardcoded Stripe live key');
  else pass('No hardcoded Stripe secrets');
}

// ── 3. Old billing files removed ─────────────────────────────────────────────
console.log('\n3. Legacy billing files removed');
for (const f of ['lib/billing.js', 'lib/billing-enhanced.js', 'routes/billing-enhanced.js']) {
  if (!fileExists(path.join(ROOT, f))) pass(`${f} removed`);
  else fail(`${f} still exists — should be deleted after consolidation`);
}

// ── 4. lib/pg-pool.js ─────────────────────────────────────────────────────────
console.log('\n4. lib/pg-pool.js centralized pool');
const pgPoolPath = path.join(ROOT, 'lib', 'pg-pool.js');
if (!fileExists(pgPoolPath)) {
  fail('lib/pg-pool.js must exist');
} else {
  pass('lib/pg-pool.js exists');
  const pg = read(pgPoolPath);
  if (pg.includes('getPool')) pass('exports getPool');
  else fail('must export getPool');
  if (pg.includes('LOCAL_PG_URL')) pass('uses LOCAL_PG_URL env var');
  else fail('must use LOCAL_PG_URL');
}

// ── 5. Inline Pool removed from refactored files ──────────────────────────────
console.log('\n5. No inline new Pool() in refactored files');
const refactored = [
  path.join(ROOT, 'routes', 'admin', 'activation-outreach.js'),
  path.join(ROOT, 'lib', 'stuck-pilots-service.js'),
];
for (const p of refactored) {
  if (!fileExists(p)) { pass(`${path.basename(p)} removed`); continue; }
  if (/new Pool\s*\(/.test(read(p))) fail(`${path.relative(ROOT,p)}: still has inline new Pool()`);
  else pass(`${path.relative(ROOT,p)}: no inline Pool()`);
}

// ── 6. stripe-subscriptions uses BillingService ───────────────────────────────
console.log('\n6. stripe-subscriptions delegates to BillingService');
const ssPath = path.join(ROOT, 'stripe-subscriptions', 'index.js');
if (fileExists(ssPath) && contains(ssPath, 'BillingService')) {
  pass('stripe-subscriptions/index.js uses BillingService');
} else if (!fileExists(ssPath)) {
  pass('stripe-subscriptions/index.js removed (n/a)');
} else {
  fail('stripe-subscriptions/index.js should delegate to BillingService');
}

// ── Summary ────────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50) + '\n');

process.exit(failed > 0 ? 1 : 0);
