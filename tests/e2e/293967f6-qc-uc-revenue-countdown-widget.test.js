/**
 * E2E Test: QC — PR #1062 uc-revenue-countdown-widget
 * Task ID: 293967f6-9e2a-4c12-9ecf-86301498a9b3
 *
 * Checks:
 * 1. TrialCountdownWidget exists and exports correctly
 * 2. AhaMomentBanner updated to self-fetch (no agentId prop)
 * 3. Email service exports new aha moment functions
 * 4. Aha-moment metrics route — verifies auth guard + magic number violation
 * 5. Day-3 cohort route field name consistency (trial_start_date vs trial_started_at)
 * 6. No duplicate simulator status routes serving same purpose
 * 7. SimulatorBanner dead code check
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASH = path.join(__dirname, '..', '..', 'product', 'lead-response', 'dashboard');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
    failed++;
    failures.push({ name, error: err.message });
  }
}

console.log('\n🔍 QC E2E: PR #1062 — uc-revenue-countdown-widget\n');

// ── 1. TrialCountdownWidget ───────────────────────────────────────────────────
test('TrialCountdownWidget component file exists', () => {
  const f = path.join(DASH, 'components', 'dashboard', 'TrialCountdownWidget.tsx');
  assert(fs.existsSync(f), `Missing: ${f}`);
});

test('TrialCountdownWidget exports named function', () => {
  const f = path.join(DASH, 'components', 'dashboard', 'TrialCountdownWidget.tsx');
  const src = fs.readFileSync(f, 'utf8');
  assert(src.includes('export function TrialCountdownWidget'), 'Missing named export');
});

test('TrialCountdownWidget uses /api/auth/trial-status (not hardcoded data)', () => {
  const f = path.join(DASH, 'components', 'dashboard', 'TrialCountdownWidget.tsx');
  const src = fs.readFileSync(f, 'utf8');
  assert(src.includes('/api/auth/trial-status'), 'Should fetch from trial-status API');
  assert(!src.includes('isTrial: true'), 'Should not hardcode trial state');
});

test('TrialCountdownWidget has data-testid on upgrade CTA button', () => {
  const f = path.join(DASH, 'components', 'dashboard', 'TrialCountdownWidget.tsx');
  const src = fs.readFileSync(f, 'utf8');
  assert(src.includes('data-testid="upgrade-cta-btn"'), 'Missing testid on CTA');
});

// ── 2. AhaMomentBanner ───────────────────────────────────────────────────────
test('AhaMomentBanner no longer requires agentId prop', () => {
  const f = path.join(DASH, 'components', 'dashboard', 'AhaMomentBanner.tsx');
  const src = fs.readFileSync(f, 'utf8');
  // Old signature had AhaMomentBannerProps with agentId: string
  assert(!src.includes('agentId: string'), 'agentId prop should have been removed');
  assert(src.includes('export function AhaMomentBanner()'), 'Should be zero-arg component');
});

test('AhaMomentBanner calls /api/onboarding/simulator-status', () => {
  const f = path.join(DASH, 'components', 'dashboard', 'AhaMomentBanner.tsx');
  const src = fs.readFileSync(f, 'utf8');
  assert(src.includes('/api/onboarding/simulator-status'), 'Should call simulator-status API');
});

test('AhaMomentBanner dismissal stores timestamp not boolean', () => {
  const f = path.join(DASH, 'components', 'dashboard', 'AhaMomentBanner.tsx');
  const src = fs.readFileSync(f, 'utf8');
  assert(src.includes('timestamp'), 'Should store dismissal timestamp for 24h check');
  assert(!src.includes("'aha_banner_dismissed', 'true'"), 'Should not store bare boolean');
});

// ── 3. Email service new functions ───────────────────────────────────────────
test('sendAhaMomentDay1Email exported from email-service', () => {
  const f = path.join(DASH, 'lib', 'email-service.ts');
  const src = fs.readFileSync(f, 'utf8');
  assert(src.includes('export async function sendAhaMomentDay1Email'), 'Missing export');
});

test('sendAhaMomentDay3Email exported from email-service', () => {
  const f = path.join(DASH, 'lib', 'email-service.ts');
  const src = fs.readFileSync(f, 'utf8');
  assert(src.includes('export async function sendAhaMomentDay3Email'), 'Missing export');
});

// ── 4. Magic number violation in aha-moment metrics route ────────────────────
test('FAIL: aha-moment metrics route has bare magic number 0.8 (should be named constant)', () => {
  const f = path.join(DASH, 'app', 'api', 'admin', 'metrics', 'aha-moment', 'route.ts');
  const src = fs.readFileSync(f, 'utf8');
  // This should NOT find a bare 0.8 — must be a named constant
  const hasBare08 = /const targetRate = 0\.8/.test(src);
  assert(!hasBare08, 'targetRate = 0.8 is a bare magic number — must be named constant (e.g. AHA_MOMENT_TARGET_RATE = 0.8 in lib/config)');
});

// ── 5. Field name mismatch — critical data bug ───────────────────────────────
test('FAIL: send-aha-day3 GET queries wrong column (trial_started_at vs trial_start_date)', () => {
  const f = path.join(DASH, 'app', 'api', 'onboarding', 'send-aha-day3', 'route.ts');
  const src = fs.readFileSync(f, 'utf8');
  // Migration (012_trial_aha_moment.sql) adds column trial_start_date
  // But GET endpoint queries trial_started_at — non-existent column, always returns empty
  const usesWrongField = src.includes('trial_started_at');
  const migration = fs.readFileSync(
    path.join(__dirname, '..', '..', 'migrations', '012_trial_aha_moment.sql'),
    'utf8'
  );
  const migrationAddsStartDate = migration.includes('trial_start_date');
  assert(!usesWrongField || !migrationAddsStartDate,
    'send-aha-day3 GET queries `trial_started_at` but migration adds `trial_start_date` — day-3 cohort will always be empty'
  );
});

// ── 6. Duplicate simulator status endpoints ───────────────────────────────────
test('FAIL: duplicate simulator-status endpoints (one pattern per operation)', () => {
  const ep1 = path.join(DASH, 'app', 'api', 'onboarding', 'simulator-status', 'route.ts');
  const ep2 = path.join(DASH, 'app', 'api', 'onboarding', 'simulator', 'status', 'route.ts');
  const bothExist = fs.existsSync(ep1) && fs.existsSync(ep2);
  // Both check the same thing: has agent completed simulator?
  // Architecture rule: one pattern per operation
  assert(!bothExist,
    'Two endpoints serve identical purpose:\n' +
    '  /api/onboarding/simulator-status (uses supabaseAdmin)\n' +
    '  /api/onboarding/simulator/status (uses supabaseServer)\n' +
    'Consolidate into one.'
  );
});

// ── 7. SimulatorBanner dead code ──────────────────────────────────────────────
test('FAIL: SimulatorBanner.tsx is dead code (not imported anywhere)', () => {
  const dashSrc = path.join(DASH, 'app', 'dashboard', 'page.tsx');
  const dashContent = fs.readFileSync(dashSrc, 'utf8');
  // SimulatorBanner was added but not imported in dashboard page
  const importedInDashboard = dashContent.includes('SimulatorBanner');
  // Check all other component files
  const dashboardComponents = path.join(DASH, 'components', 'dashboard');
  const componentFiles = fs.readdirSync(dashboardComponents)
    .filter(f => f !== 'SimulatorBanner.tsx')
    .map(f => fs.readFileSync(path.join(dashboardComponents, f), 'utf8'));
  const importedAnywhere = importedInDashboard || componentFiles.some(c => c.includes('SimulatorBanner'));
  assert(importedAnywhere, 'SimulatorBanner.tsx is defined but never imported — dead code should be removed');
});

// ── Summary ───────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'─'.repeat(52)}`);
console.log(`  Passed: ${passed}/${total}`);
if (failures.length > 0) {
  console.log(`\n  Failures requiring fixes:`);
  failures.forEach(f => console.log(`  • ${f.name}`));
}
console.log(`${'─'.repeat(52)}\n`);

process.exit(failed > 0 ? 1 : 0);
