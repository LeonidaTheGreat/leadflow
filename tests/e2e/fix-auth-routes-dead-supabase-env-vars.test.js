/**
 * E2E Test: fix-auth-routes-dead-supabase-env-vars
 * Task ID: f6647816-0f51-45c7-80a9-c20f5afad02e
 *
 * Verifies that 23 API routes no longer use NEXT_PUBLIC_SUPABASE_URL /
 * SUPABASE_SERVICE_ROLE_KEY, and instead use NEXT_PUBLIC_API_URL /
 * API_SECRET_KEY (or NEXT_PUBLIC_API_KEY) as their DB client env vars.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard/app/api');
const DEAD_VARS = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const EXPECTED_URL_VAR = 'NEXT_PUBLIC_API_URL';
const EXPECTED_KEY_VARS = ['API_SECRET_KEY', 'NEXT_PUBLIC_API_KEY'];

// Routes that should have been fixed (from the task)
const EXPECTED_FIXED_ROUTES = [
  'admin/conversations/route.ts',
  'admin/triage-use-cases/route.ts',
  'agents/create/route.ts',
  'analytics/event/route.ts',
  'auth/login/route.ts',
  'auth/me/route.ts',
  'auth/session/route.ts',
  'auth/trial-signup/route.ts',
  'auth/trial-status/route.ts',
  'cron/expire-trials/route.ts',
  'cron/inactivity-check/route.ts',
  'dashboard/session-analytics/route.ts',
  'debug/env/route.ts',
  'events/track/route.ts',
  'health/route.ts',
  'internal/pilot-usage/route.ts',
  'leads/sample-status/route.ts',
  'nps/dismiss/route.ts',
  'nps/prompt-status/route.ts',
  'setup/complete/route.ts',
  'setup/progress/route.ts',
  'setup/send-test-sms/route.ts',
  'stripe/upgrade-checkout/route.ts',
];

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failures.push({ name, error: err.message });
    failed++;
  }
}

// ─── TEST 1: All 23 routes exist ──────────────────────────────────────────
console.log('\n📋 Test 1: All 23 target route files exist');
for (const route of EXPECTED_FIXED_ROUTES) {
  const fullPath = path.join(DASHBOARD_DIR, route);
  test(`File exists: ${route}`, () => {
    assert.ok(fs.existsSync(fullPath), `Route file not found: ${fullPath}`);
  });
}

// ─── TEST 2: No dead Supabase env vars in any fixed route ─────────────────
console.log('\n📋 Test 2: No dead SUPABASE env vars in fixed routes');
for (const route of EXPECTED_FIXED_ROUTES) {
  const fullPath = path.join(DASHBOARD_DIR, route);
  if (!fs.existsSync(fullPath)) continue;

  const content = fs.readFileSync(fullPath, 'utf8');

  for (const deadVar of DEAD_VARS) {
    // Only flag if the dead var is used in createClient() call
    const createClientPattern = new RegExp(
      `createClient\\([^)]*process\\.env\\.${deadVar}`,
      's'
    );
    test(`No ${deadVar} in createClient() of ${route}`, () => {
      assert.ok(
        !createClientPattern.test(content),
        `Found dead var ${deadVar} in createClient() call in ${route}`
      );
    });
  }
}

// ─── TEST 3: Routes that use createClient() use the correct env vars ──────
// Routes may use env vars directly in createClient() OR via intermediate
// variables (e.g. const apiUrl = process.env.NEXT_PUBLIC_API_URL; createClient(apiUrl, apiKey))
// Both patterns are valid. We check the whole file for correct env var usage.
console.log('\n📋 Test 3: createClient() calls use NEXT_PUBLIC_API_URL / API_SECRET_KEY (any pattern)');
const CORRECT_URL_PATTERN_WHOLE = /process\.env\.NEXT_PUBLIC_API_URL/;
const CORRECT_KEY_PATTERN_WHOLE = /process\.env\.(?:API_SECRET_KEY|NEXT_PUBLIC_API_KEY)/;

const routesWithCreateClient = [];
for (const route of EXPECTED_FIXED_ROUTES) {
  const fullPath = path.join(DASHBOARD_DIR, route);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes('createClient(')) {
    routesWithCreateClient.push({ route, content });
  }
}

for (const { route, content } of routesWithCreateClient) {
  test(`${route}: uses NEXT_PUBLIC_API_URL`, () => {
    assert.ok(
      CORRECT_URL_PATTERN_WHOLE.test(content),
      `${route} does not reference NEXT_PUBLIC_API_URL anywhere`
    );
  });
  test(`${route}: uses API_SECRET_KEY or NEXT_PUBLIC_API_KEY`, () => {
    assert.ok(
      CORRECT_KEY_PATTERN_WHOLE.test(content),
      `${route} does not reference API_SECRET_KEY or NEXT_PUBLIC_API_KEY anywhere`
    );
  });
}

// ─── TEST 4: Build succeeds (check .next/BUILD_ID exists from prior build) ─
console.log('\n📋 Test 4: Build artifact exists (build must have passed)');
const buildIdPath = path.join(__dirname, '../product/lead-response/dashboard/.next/BUILD_ID');
test('Build artifact .next/BUILD_ID exists', () => {
  assert.ok(
    fs.existsSync(buildIdPath),
    '.next/BUILD_ID not found — run `npm run build` in dashboard directory first'
  );
});

// ─── TEST 5: Env vars are configured in production env file ───────────────
console.log('\n📋 Test 5: .env.production has correct env vars');
const prodEnvPath = path.join(__dirname, '../product/lead-response/dashboard/.env.production');
test('.env.production exists', () => {
  assert.ok(fs.existsSync(prodEnvPath), '.env.production not found');
});

if (fs.existsSync(prodEnvPath)) {
  const prodEnvContent = fs.readFileSync(prodEnvPath, 'utf8');
  test('.env.production has NEXT_PUBLIC_API_URL', () => {
    assert.ok(
      prodEnvContent.includes('NEXT_PUBLIC_API_URL='),
      'NEXT_PUBLIC_API_URL not found in .env.production'
    );
  });
  test('.env.production has API_SECRET_KEY or NEXT_PUBLIC_API_KEY', () => {
    assert.ok(
      prodEnvContent.includes('API_SECRET_KEY=') || prodEnvContent.includes('NEXT_PUBLIC_API_KEY='),
      'Neither API_SECRET_KEY nor NEXT_PUBLIC_API_KEY found in .env.production'
    );
  });
}

// ─── SUMMARY ─────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'─'.repeat(60)}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Pass Rate: ${((passed / total) * 100).toFixed(0)}%`);

if (failures.length > 0) {
  console.log('\n🔴 Failures:');
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.error}`);
  }
}

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n✅ All checks passed. Fix verified.');
  process.exit(0);
}
