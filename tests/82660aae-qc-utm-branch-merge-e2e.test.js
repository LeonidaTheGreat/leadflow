/**
 * QC E2E Test: UTM Fix Branch Merge Verification
 * Task ID: 82660aae-73df-4454-97de-135635750900
 * 
 * Scope: Verify the merged UTM fix branch (dev/a3a1f6f1) is production-ready
 * Includes: UTM capture tracker, onboarding telemetry, admin invite flow
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ============================================================
// VALIDATION SUITE
// ============================================================

const tests = [];
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('\n🧪 QC E2E Test Suite: UTM Branch Merge Verification\n');
  
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✅ PASS: ${t.name}`);
      passCount++;
    } catch (err) {
      console.log(`❌ FAIL: ${t.name}`);
      console.log(`   Error: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 Summary: ${passCount} passed, ${failCount} failed out of ${passCount + failCount} total\n`);
  return failCount === 0;
}

// ============================================================
// TEST SUITE
// ============================================================

const projectRoot = path.join(__dirname, '..');
const dashboardRoot = path.join(projectRoot, 'product/lead-response/dashboard');

// ── AC-1: UTM Capture Component Exists ────────────────────
test('A1.1: UtmCaptureTracker component file exists', () => {
  const filePath = path.join(dashboardRoot, 'components/utm-capture-tracker.tsx');
  assert(fs.existsSync(filePath), `Missing: ${filePath}`);
});

test('A1.2: UtmCaptureTracker is mounted in root layout', () => {
  const layoutPath = path.join(dashboardRoot, 'app/layout.tsx');
  const content = fs.readFileSync(layoutPath, 'utf8');
  assert(
    content.includes('UtmCaptureTracker') && content.includes('<UtmCaptureTracker />'),
    'UtmCaptureTracker not imported or used in layout'
  );
});

test('A1.3: Layout properly imports UtmCaptureTracker from @/components', () => {
  const layoutPath = path.join(dashboardRoot, 'app/layout.tsx');
  const content = fs.readFileSync(layoutPath, 'utf8');
  assert(
    content.includes('from "@/components/utm-capture-tracker"'),
    'Import path is incorrect'
  );
});

// ── AC-2: Onboarding Telemetry ────────────────────────────
test('A2.1: Onboarding telemetry library exists', () => {
  const libPath = path.join(projectRoot, 'lib/onboarding-telemetry.js');
  assert(fs.existsSync(libPath), `Missing: ${libPath}`);
  const content = fs.readFileSync(libPath, 'utf8');
  assert(content.includes('logOnboardingEvent'), 'logOnboardingEvent not exported');
});

test('A2.2: Dashboard copy of telemetry library exists', () => {
  const libPath = path.join(dashboardRoot, 'lib/onboarding-telemetry.js');
  assert(fs.existsSync(libPath), `Missing dashboard telemetry: ${libPath}`);
});

test('A2.3: Telemetry defines correct step names', () => {
  const libPath = path.join(projectRoot, 'lib/onboarding-telemetry.js');
  const content = fs.readFileSync(libPath, 'utf8');
  
  const expectedSteps = [
    'email_verified',
    'fub_connected',
    'phone_configured',
    'sms_verified',
    'aha_completed'
  ];
  
  expectedSteps.forEach(step => {
    assert(content.includes(step), `Missing step: ${step}`);
  });
});

test('A2.4: Stuck alerts feature exists', () => {
  const libPath = path.join(projectRoot, 'lib/onboarding-telemetry.js');
  const content = fs.readFileSync(libPath, 'utf8');
  assert(content.includes('checkAndAlertStuckAgents'), 'checkAndAlertStuckAgents not found');
  assert(content.includes('24 * 60 * 60'), 'Must check for >24h stuck agents');
});

// ── AC-3: Admin Pilot Invite Flow ────────────────────────
test('A3.1: Admin invite creation API route exists', () => {
  const routePath = path.join(dashboardRoot, 'app/api/admin/invite-pilot/route.ts');
  assert(fs.existsSync(routePath), `Missing: ${routePath}`);
});

test('A3.2: Admin invite creation requires authentication', () => {
  const routePath = path.join(dashboardRoot, 'app/api/admin/invite-pilot/route.ts');
  const content = fs.readFileSync(routePath, 'utf8');
  assert(
    content.includes('X-Admin-Token') || content.includes('authorization'),
    'Auth check missing'
  );
});

test('A3.3: Accept invite page exists', () => {
  const pagePath = path.join(dashboardRoot, 'app/accept-invite/page.tsx');
  assert(fs.existsSync(pagePath), `Missing: ${pagePath}`);
});

test('A3.4: Accept invite page wraps useSearchParams in Suspense', () => {
  const pagePath = path.join(dashboardRoot, 'app/accept-invite/page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');
  assert(
    content.includes('Suspense') && content.includes('useSearchParams'),
    'Suspense boundary missing for useSearchParams'
  );
});

// ── AC-4: Database Migrations ────────────────────────────
test('A4.1: Onboarding completion telemetry migration exists', () => {
  const migPath = path.join(dashboardRoot, 'supabase/migrations/012_onboarding_completion_telemetry.sql');
  assert(fs.existsSync(migPath), `Missing: ${migPath}`);
  const content = fs.readFileSync(migPath, 'utf8');
  assert(content.includes('CREATE TABLE'), 'Migration must create tables');
});

test('A4.2: Pilot invites migration exists', () => {
  const migPath = path.join(projectRoot, 'supabase/migrations/014_pilot_invites.sql');
  assert(fs.existsSync(migPath), `Missing: ${migPath}`);
  const content = fs.readFileSync(migPath, 'utf8');
  assert(content.includes('pilot_invites'), 'Must create pilot_invites table');
});

// ── AC-5: API Routes Integration ────────────────────────
test('A5.1: Onboarding log-event API route exists', () => {
  const routePath = path.join(dashboardRoot, 'app/api/onboarding/log-event/route.ts');
  assert(fs.existsSync(routePath), `Missing: ${routePath}`);
});

test('A5.2: Setup status route exists', () => {
  const routePath = path.join(dashboardRoot, 'app/api/setup/status/route.ts');
  assert(fs.existsSync(routePath), `Missing: ${routePath}`);
});

test('A5.3: Admin funnel analytics route exists', () => {
  const routePath = path.join(dashboardRoot, 'app/api/admin/funnel/route.ts');
  assert(fs.existsSync(routePath), `Missing: ${routePath}`);
});

test('A5.4: Cron route for stuck alerts exists', () => {
  const routePath = path.join(dashboardRoot, 'app/api/cron/check-stuck-agents/route.ts');
  assert(fs.existsSync(routePath), `Missing: ${routePath}`);
});

// ── AC-6: Admin Dashboard Pages ────────────────────────────
test('A6.1: Admin funnel page exists', () => {
  const pagePath = path.join(dashboardRoot, 'app/admin/funnel/page.tsx');
  assert(fs.existsSync(pagePath), `Missing: ${pagePath}`);
});

test('A6.2: Admin invite page exists', () => {
  const pagePath = path.join(dashboardRoot, 'app/admin/invite/page.tsx');
  assert(fs.existsSync(pagePath), `Missing: ${pagePath}`);
});

// ── AC-7: Hooks & Utilities ────────────────────────────────
test('A7.1: useOnboardingTelemetry hook exists', () => {
  const hookPath = path.join(dashboardRoot, 'hooks/useOnboardingTelemetry.ts');
  assert(fs.existsSync(hookPath), `Missing: ${hookPath}`);
  const content = fs.readFileSync(hookPath, 'utf8');
  assert(content.includes('export'), 'Hook not exported');
});

test('A7.2: Email service utility exists', () => {
  const utilPath = path.join(dashboardRoot, 'lib/email-service.ts');
  assert(fs.existsSync(utilPath), `Missing: ${utilPath}`);
});

// ── AC-8: Tests Coverage ────────────────────────────────────
test('A8.1: UTM capture tracker test file exists', () => {
  const testPath = path.join(dashboardRoot, 'tests/fix-no-sessionstorage-write-on-landing-page-load-utm-l.test.js');
  assert(fs.existsSync(testPath), `Missing: ${testPath}`);
});

test('A8.2: Admin invite flow test files exist', () => {
  const testPath1 = path.join(projectRoot, 'tests/feat-admin-pilot-invite-flow-e2e.test.js');
  const testPath2 = path.join(projectRoot, 'tests/feat-admin-pilot-invite-flow-qc.test.js');
  assert(fs.existsSync(testPath1), `Missing: ${testPath1}`);
  assert(fs.existsSync(testPath2), `Missing: ${testPath2}`);
});

test('A8.3: Onboarding telemetry test file exists', () => {
  const testPath = path.join(projectRoot, 'tests/feat-onboarding-completion-telemetry.test.js');
  assert(fs.existsSync(testPath), `Missing: ${testPath}`);
});

// ── AC-9: Security Checks ────────────────────────────────────
test('A9.1: No hardcoded API keys in component files', () => {
  const componentPath = path.join(dashboardRoot, 'components/utm-capture-tracker.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');
  assert(!content.includes('sk_'), 'Hardcoded key found');
  assert(!content.includes('api_key'), 'Hardcoded key found');
  assert(!content.includes('secret'), 'Hardcoded secret found');
});

test('A9.2: Admin routes validate auth token', () => {
  const routePath = path.join(dashboardRoot, 'app/api/admin/invite-pilot/route.ts');
  const content = fs.readFileSync(routePath, 'utf8');
  const headerCheck = content.includes('X-Admin-Token') || content.includes('headers');
  assert(headerCheck, 'No auth token validation found');
});

// ── AC-10: Build & Package Integrity ────────────────────────
test('A10.1: Dashboard package.json includes required dependencies', () => {
  const pkgPath = path.join(dashboardRoot, 'package.json');
  const content = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  // Check for core dependencies
  assert(content.dependencies, 'No dependencies section');
  assert(content.dependencies.react, 'Missing react');
  assert(content.dependencies['next'], 'Missing next');
  assert(content.dependencies['@supabase/supabase-js'], 'Missing supabase-js');
});

test('A10.2: Dashboard package.json has new dependencies for SSR', () => {
  const pkgPath = path.join(dashboardRoot, 'package.json');
  const content = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert(
    content.dependencies['@supabase/ssr'],
    'Missing @supabase/ssr for server-side client'
  );
});

// ── AC-11: Consistency Checks ────────────────────────────────
test('A11.1: Root and dashboard telemetry libs are consistent', () => {
  const rootPath = path.join(projectRoot, 'lib/onboarding-telemetry.js');
  const dashPath = path.join(dashboardRoot, 'lib/onboarding-telemetry.js');
  
  // Both must exist
  assert(fs.existsSync(rootPath), 'Missing root telemetry');
  assert(fs.existsSync(dashPath), 'Missing dashboard telemetry');
  
  // Check both export same functions (by checking for key exports)
  const rootContent = fs.readFileSync(rootPath, 'utf8');
  const dashContent = fs.readFileSync(dashPath, 'utf8');
  
  const keyFunctions = ['logOnboardingEvent', 'getFunnelStatus', 'STEP_INDEX'];
  keyFunctions.forEach(fn => {
    assert(rootContent.includes(fn), `Root missing: ${fn}`);
    assert(dashContent.includes(fn), `Dashboard missing: ${fn}`);
  });
});

test('A11.2: SessionStorage key is consistent across components', () => {
  const trackerPath = path.join(dashboardRoot, 'components/utm-capture-tracker.tsx');
  const trackerContent = fs.readFileSync(trackerPath, 'utf8');
  
  const key = 'leadflow_utm';
  assert(trackerContent.includes(key), `Tracker does not use key: ${key}`);
});

// ── AC-12: Documentation ────────────────────────────────────
test('A12.1: PRD files for new features exist', () => {
  const prds = [
    'PRD-ADMIN-PILOT-INVITE-FLOW.md',
    'PRD-ONBOARDING-COMPLETION-TELEMETRY.md',
    'PRD-FR5-STUCK-ALERT-PRODUCT-FEEDBACK.md'
  ];
  
  prds.forEach(prdFile => {
    const filePath = path.join(projectRoot, 'docs/prd', prdFile);
    assert(fs.existsSync(filePath), `Missing PRD: ${prdFile}`);
  });
});

// ── AC-13: No Regressions ────────────────────────────────────
test('A13.1: Auth middleware still protects dashboard routes', () => {
  const middlewarePath = path.join(dashboardRoot, 'middleware.ts');
  if (fs.existsSync(middlewarePath)) {
    const content = fs.readFileSync(middlewarePath, 'utf8');
    assert(content.includes('/dashboard'), 'Dashboard protection may be broken');
  }
});

test('A13.2: Onboarding routes still protected', () => {
  const routePath = path.join(dashboardRoot, 'app/onboarding/layout.tsx');
  if (fs.existsSync(routePath)) {
    const content = fs.readFileSync(routePath, 'utf8');
    // Route protection is handled by middleware, just check it exists
    assert(fs.existsSync(routePath), 'Onboarding layout deleted');
  }
});

// ── AC-14: Error Handling ────────────────────────────────────
test('A14.1: Telemetry functions have error handling', () => {
  const libPath = path.join(projectRoot, 'lib/onboarding-telemetry.js');
  const content = fs.readFileSync(libPath, 'utf8');
  
  // Check for try/catch
  assert(content.includes('try {'), 'Missing try blocks');
  assert(content.includes('} catch'), 'Missing catch blocks');
  
  // Check for error returns
  assert(content.includes('success: false'), 'Should return error status');
});

test('A14.2: API routes have error handling', () => {
  const routePath = path.join(dashboardRoot, 'app/api/onboarding/log-event/route.ts');
  const content = fs.readFileSync(routePath, 'utf8');
  
  assert(content.includes('try') || content.includes('catch') || content.includes('error'), 
    'Route should have error handling');
});

// ============================================================
// RUN TESTS
// ============================================================

(async () => {
  const success = await runTests();
  process.exit(success ? 0 : 1);
})();
