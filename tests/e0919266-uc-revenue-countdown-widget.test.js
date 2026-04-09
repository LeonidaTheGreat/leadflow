/**
 * E2E Test: uc-revenue-countdown-widget (PR #1077)
 * Task ID: e0919266-27d6-4e85-b1de-1fb2f63fafc1
 *
 * QC review — validates:
 * 1. Build succeeds (CRITICAL — currently fails)
 * 2. No duplicate simulator status endpoints
 * 3. No duplicate simulator pages
 * 4. Column name consistency (trial_start_date vs trial_started_at)
 * 5. TrialCountdownWidget has no bare magic numbers
 * 6. New components are actually imported where used
 * 7. No hardcoded secrets
 * 8. Email-service exports match imports
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DASHBOARD = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}

// ─── Test 1: TrialCountdownWidget exists ─────────────────────────────────────
test('TrialCountdownWidget component exists', () => {
  const p = path.join(DASHBOARD, 'components', 'dashboard', 'TrialCountdownWidget.tsx');
  assert(fs.existsSync(p), 'TrialCountdownWidget.tsx not found');
});

// ─── Test 2: TrialCountdownWidget is imported in dashboard page ──────────────
test('TrialCountdownWidget is imported in dashboard page (dead code check)', () => {
  const p = path.join(DASHBOARD, 'app', 'dashboard', 'page.tsx');
  const content = fs.readFileSync(p, 'utf8');
  // Component exists but is NOT imported — dead code
  const componentExists = fs.existsSync(
    path.join(DASHBOARD, 'components', 'dashboard', 'TrialCountdownWidget.tsx')
  );
  const isImported = content.includes('TrialCountdownWidget');
  assert(!componentExists || isImported, 'TrialCountdownWidget.tsx created but never imported in dashboard page — dead code');
});

// ─── Test 3: AhaMomentBanner no longer requires agentId prop ─────────────────
test('AhaMomentBanner is self-contained (no agentId prop)', () => {
  const p = path.join(DASHBOARD, 'components', 'dashboard', 'AhaMomentBanner.tsx');
  const content = fs.readFileSync(p, 'utf8');
  assert(!content.includes('interface AhaMomentBannerProps'), 'Should not have a props interface');
  assert(content.includes('export function AhaMomentBanner()'), 'Should be a no-arg export');
});

// ─── Test 4: Duplicate simulator status routes ───────────────────────────────
test('DUPLICATE: Two nearly identical simulator-status endpoints exist (architectural violation)', () => {
  const route1 = path.join(DASHBOARD, 'app', 'api', 'onboarding', 'simulator-status', 'route.ts');
  const route2 = path.join(DASHBOARD, 'app', 'api', 'onboarding', 'simulator', 'status', 'route.ts');
  const exists1 = fs.existsSync(route1);
  const exists2 = fs.existsSync(route2);
  // Both exist — this is a duplication violation
  assert(!(exists1 && exists2), 'Two simulator-status endpoints exist: /simulator-status and /simulator/status — violates one-pattern-per-operation');
});

// ─── Test 5: Duplicate simulator pages ───────────────────────────────────────
test('DUPLICATE: Two nearly identical simulator pages exist (architectural violation)', () => {
  const page1 = path.join(DASHBOARD, 'app', 'setup', 'simulator', 'page.tsx');
  const page2 = path.join(DASHBOARD, 'app', 'simulator', 'page.tsx');
  const exists1 = fs.existsSync(page1);
  const exists2 = fs.existsSync(page2);
  assert(!(exists1 && exists2), 'Two simulator pages exist: /setup/simulator and /simulator — violates one-pattern-per-operation');
});

// ─── Test 6: Column name mismatch in send-aha-day3 ──────────────────────────
test('send-aha-day3 GET uses correct column name (trial_start_date)', () => {
  const p = path.join(DASHBOARD, 'app', 'api', 'onboarding', 'send-aha-day3', 'route.ts');
  const content = fs.readFileSync(p, 'utf8');
  // The migration adds trial_start_date, but this file queries trial_started_at
  assert(!content.includes('trial_started_at'), 'Uses trial_started_at but column is trial_start_date — query will fail at runtime');
});

// ─── Test 7: TrialCountdownWidget obfuscated property access ─────────────────
test('TrialCountdownWidget does not obfuscate property names', () => {
  const p = path.join(DASHBOARD, 'components', 'dashboard', 'TrialCountdownWidget.tsx');
  const content = fs.readFileSync(p, 'utf8');
  // String concatenation to build a property name is obfuscation
  assert(!content.includes("'isExpir' + 'ed'"), 'Should not use string concatenation to build property keys');
});

// ─── Test 8: Magic numbers in TrialCountdownWidget ──────────────────────────
test('TrialCountdownWidget urgency thresholds should be named constants', () => {
  const p = path.join(DASHBOARD, 'components', 'dashboard', 'TrialCountdownWidget.tsx');
  const content = fs.readFileSync(p, 'utf8');
  // daysRemaining <= 3 and <= 7 are bare magic numbers for business logic
  const hasNamedConstants = content.includes('URGENT_DAYS') || content.includes('WARN_DAYS');
  const hasBareNumbers = /daysRemaining\s*<=\s*3/.test(content) && /daysRemaining\s*<=\s*7/.test(content);
  assert(hasNamedConstants || !hasBareNumbers, 'Urgency thresholds (3, 7) should be named constants');
});

// ─── Test 9: SimulatorBanner created but unused ─────────────────────────────
test('SimulatorBanner is imported somewhere if created', () => {
  const bannerPath = path.join(DASHBOARD, 'components', 'dashboard', 'SimulatorBanner.tsx');
  if (!fs.existsSync(bannerPath)) return; // fine if it doesn't exist
  // Check if it's imported anywhere in the dashboard
  try {
    const result = execSync(
      `grep -r "SimulatorBanner" --include="*.tsx" --include="*.ts" "${DASHBOARD}/app" 2>/dev/null || true`,
      { encoding: 'utf8' }
    );
    assert(result.trim().length > 0, 'SimulatorBanner.tsx exists but is never imported in any page');
  } catch {
    assert.fail('SimulatorBanner.tsx exists but is never imported in any page');
  }
});

// ─── Test 10: Magic number in aha-moment metrics ────────────────────────────
test('aha-moment metrics target rate should be a named constant', () => {
  const p = path.join(DASHBOARD, 'app', 'api', 'admin', 'metrics', 'aha-moment', 'route.ts');
  const content = fs.readFileSync(p, 'utf8');
  // targetRate = 0.8 is a bare magic number
  const hasNamedConstant = /(?:TARGET_RATE|AHA_TARGET)\s*=/.test(content);
  const hasBareNumber = /targetRate\s*=\s*0\.8/.test(content);
  assert(hasNamedConstant || !hasBareNumber, 'Target rate 0.8 should be a named constant (e.g. AHA_TARGET_RATE)');
});

// ─── Test 11: No hardcoded secrets ──────────────────────────────────────────
test('No hardcoded secrets in new files', () => {
  const files = [
    path.join(DASHBOARD, 'app', 'api', 'admin', 'metrics', 'aha-moment', 'route.ts'),
    path.join(DASHBOARD, 'app', 'api', 'onboarding', 'send-aha-day1', 'route.ts'),
    path.join(DASHBOARD, 'app', 'api', 'onboarding', 'send-aha-day3', 'route.ts'),
    path.join(DASHBOARD, 'lib', 'email-service.ts'),
  ];
  const patterns = [/sk-[a-zA-Z0-9]{20,}/, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]{10,}/];
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const content = fs.readFileSync(f, 'utf8');
    for (const p of patterns) {
      assert(!p.test(content), `Hardcoded secret found in ${path.basename(f)}`);
    }
  }
});

// ─── Test 12: Build check (most critical) ───────────────────────────────────
test('Dashboard build succeeds', () => {
  // We know from the build output that email-service imports are broken
  // Verify the specific broken imports
  const emailService = path.join(DASHBOARD, 'lib', 'email-service.ts');
  const content = fs.readFileSync(emailService, 'utf8');

  // Check that sendPilotWelcomeEmail, sendWelcomeEmail exports exist
  const hasSendPilotWelcome = content.includes('export async function sendPilotWelcomeEmail') ||
    content.includes('export function sendPilotWelcomeEmail');
  const hasSendWelcome = content.includes('export async function sendWelcomeEmail') ||
    content.includes('export function sendWelcomeEmail');

  // These are expected to be missing based on build output
  // If they ARE missing, the build WILL fail
  if (!hasSendPilotWelcome || !hasSendWelcome) {
    assert.fail(
      'email-service.ts missing exports: ' +
      (!hasSendPilotWelcome ? 'sendPilotWelcomeEmail ' : '') +
      (!hasSendWelcome ? 'sendWelcomeEmail ' : '') +
      '— build fails with import errors'
    );
  }
});

// ─── Summary ────────────────────────────────────────────────────────────────
console.log('\n==============================================');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(0)}%`);
console.log('==============================================');

if (failed > 0) process.exit(1);
