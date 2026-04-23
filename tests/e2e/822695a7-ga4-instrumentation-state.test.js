/**
 * E2E: GA4 instrumentation state
 *
 * Verifies the actual GA4 state in the production codebase.
 * The diagnosis doc (docs/TRAFFIC-VS-CONVERSION-DIAGNOSIS-2025-02-14.md) claims
 * GA4 is "not wired into any application entrypoint" — this test proves that
 * claim is factually wrong for the deployed app.
 *
 * Real state:
 *   - product/lead-response/dashboard/lib/analytics/ga4.ts  ← active implementation
 *   - Used in layout.tsx, pilot/page.tsx, signup/page.tsx, page.tsx
 *   - Silenced by NEXT_PUBLIC_GA4_MEASUREMENT_ID="" (not by missing wiring)
 *
 *   - frontend/src/lib/ga4.ts  ← orphaned legacy file (doc's finding is correct but
 *                                 analyzes the wrong directory)
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DASHBOARD = path.join(ROOT, 'product/lead-response/dashboard');

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${label}`);
    console.log(`     ${err.message}`);
    failed++;
  }
}

console.log('\n── GA4 Instrumentation State ──\n');

// ── 1. The REAL GA4 implementation exists in the deployed app ──────────────
console.log('1. Deployed GA4 implementation');

const realGa4 = path.join(DASHBOARD, 'lib/analytics/ga4.ts');
check('lib/analytics/ga4.ts exists in deployed dashboard', () => {
  assert.ok(fs.existsSync(realGa4), `Missing: ${realGa4}`);
});

check('GA4 module exports trackCTAClick, trackFormEvent, injectGA4Script', () => {
  const src = fs.readFileSync(realGa4, 'utf8');
  assert.ok(src.includes('trackCTAClick'), 'missing trackCTAClick export');
  assert.ok(src.includes('trackFormEvent'), 'missing trackFormEvent export');
  assert.ok(src.includes('injectGA4Script') || src.includes('GA_ID') || src.includes('gtag'), 'missing GA4 init function');
});

// ── 2. GA4 IS wired into the production app (refutes diagnosis doc claim) ──
console.log('\n2. GA4 IS imported in the production app');

const layoutFile = path.join(DASHBOARD, 'app/layout.tsx');
check('app/layout.tsx exists', () => {
  assert.ok(fs.existsSync(layoutFile), `Missing: ${layoutFile}`);
});

check('layout.tsx references GA4 (measurement ID or gtag)', () => {
  const src = fs.readFileSync(layoutFile, 'utf8');
  const hasGA4 = src.includes('NEXT_PUBLIC_GA4_MEASUREMENT_ID') ||
                 src.includes('ga4') ||
                 src.includes('gtag') ||
                 src.includes('GA_ID');
  assert.ok(hasGA4, 'layout.tsx has no GA4 reference — instrumentation may be missing');
});

const pilotPage = path.join(DASHBOARD, 'app/pilot/page.tsx');
check('pilot/page.tsx imports GA4 analytics', () => {
  assert.ok(fs.existsSync(pilotPage), `Missing: ${pilotPage}`);
  const src = fs.readFileSync(pilotPage, 'utf8');
  assert.ok(
    src.includes('@/lib/analytics/ga4') || src.includes('trackFormEvent') || src.includes('trackCTAClick'),
    'pilot/page.tsx does not import GA4'
  );
});

const signupPage = path.join(DASHBOARD, 'app/signup/page.tsx');
check('signup/page.tsx imports GA4 analytics', () => {
  assert.ok(fs.existsSync(signupPage), `Missing: ${signupPage}`);
  const src = fs.readFileSync(signupPage, 'utf8');
  assert.ok(
    src.includes('@/lib/analytics/ga4') || src.includes('trackFormEvent'),
    'signup/page.tsx does not import GA4'
  );
});

// ── 3. Real reason GA4 is silent: layout.tsx conditionally gates on GA_ID ───
// .env files are gitignored — we verify the guard in source code instead.
// When NEXT_PUBLIC_GA4_MEASUREMENT_ID is empty, GA_ID resolves to undefined
// and {GA_ID && (<Script .../>)} prevents the script from being injected.
console.log('\n3. layout.tsx conditionally gates GA4 on measurement ID');

check('layout.tsx reads NEXT_PUBLIC_GA4_MEASUREMENT_ID', () => {
  const src = fs.readFileSync(layoutFile, 'utf8');
  assert.ok(
    src.includes('NEXT_PUBLIC_GA4_MEASUREMENT_ID'),
    'layout.tsx does not reference NEXT_PUBLIC_GA4_MEASUREMENT_ID'
  );
});

check('layout.tsx guards GA4 script injection (conditional on GA_ID)', () => {
  const src = fs.readFileSync(layoutFile, 'utf8');
  // The guard pattern: GA_ID is derived from env var and used conditionally
  // e.g. const GA_ID = (process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '').trim() || undefined
  // and  {GA_ID && (<Script .../>)}
  const hasGuard = (src.includes('GA_ID &&') || src.includes('GA_ID?') || src.includes('{GA_ID '));
  assert.ok(hasGuard,
    'layout.tsx does not guard GA4 script on GA_ID — GA4 may fire even with empty measurement ID'
  );
});

check('layout.tsx resolves empty env var to undefined (silences GA4)', () => {
  const src = fs.readFileSync(layoutFile, 'utf8');
  // Pattern: ('').trim() || undefined  OR  || undefined
  const hasUndefinedFallback = src.includes('|| undefined') || src.includes("|| ''");
  assert.ok(hasUndefinedFallback,
    'layout.tsx does not convert empty string to undefined — GA4 may init with empty ID'
  );
});

// ── 4. Legacy frontend/src/lib/ga4.ts IS orphaned (doc's one correct claim) ─
console.log('\n4. Legacy frontend/src/lib/ga4.ts is orphaned');

const legacyGa4 = path.join(ROOT, 'frontend/src/lib/ga4.ts');
check('frontend/src/lib/ga4.ts exists (legacy file)', () => {
  assert.ok(fs.existsSync(legacyGa4), `Legacy file not found: ${legacyGa4}`);
});

check('frontend/src contains no imports of the legacy GA4 module', () => {
  const frontendSrc = path.join(ROOT, 'frontend/src');
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) files.push(full);
    }
  }
  walk(frontendSrc);

  const importers = files.filter(f => {
    if (f === legacyGa4) return false; // skip self
    const src = fs.readFileSync(f, 'utf8');
    return src.includes('ga4') || src.includes('trackCTAClick') || src.includes('injectGA4Script');
  });

  assert.strictEqual(importers.length, 0,
    `Unexpected importers of legacy GA4: ${importers.join(', ')}`
  );
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);

if (failed > 0) {
  process.exit(1);
}
