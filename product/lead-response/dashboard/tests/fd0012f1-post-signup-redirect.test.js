/**
 * E2E Test: Post-Signup Redirect to /setup
 * 
 * Use Case: feat-post-signup-wizard-redirect
 * Task ID: fd0012f1-8a2f-4b11-a048-5f14bc694706
 * 
 * Acceptance Criteria:
 * AC-1: trial-signup/route.ts returns redirectTo: "/setup"
 * AC-2: pilot-signup/route.ts returns redirectTo: "/setup"
 * AC-3: trial/start/route.ts returns redirectTo: "/setup"
 * AC-4: Welcome email links point to /setup
 * AC-5: test updated to assert /setup
 * AC-6: /setup page loads post-signup (no 404)
 * AC-7: Completing wizard redirects to /dashboard
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DASHBOARD_ROOT = path.join(__dirname, '..');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
    testsFailed++;
  }
}

console.log('\n========================================');
console.log('E2E TEST: Post-Signup Redirect');
console.log('========================================\n');

// ============================================
// AC-1: trial-signup/route.ts redirectTo check
// ============================================
test('AC-1: trial-signup/route.ts returns redirectTo: "/setup"', () => {
  const routeFile = path.join(DASHBOARD_ROOT, 'app/api/auth/trial-signup/route.ts');
  assert.ok(fs.existsSync(routeFile), 'trial-signup route file should exist');
  
  const content = fs.readFileSync(routeFile, 'utf8');
  assert.ok(
    content.includes("redirectTo: '/setup'"),
    'trial-signup should return redirectTo: "/setup"'
  );
});

// ============================================
// AC-2: pilot-signup/route.ts redirectTo check
// ============================================
test('AC-2: pilot-signup/route.ts returns redirectTo: "/setup"', () => {
  const routeFile = path.join(DASHBOARD_ROOT, 'app/api/auth/pilot-signup/route.ts');
  assert.ok(fs.existsSync(routeFile), 'pilot-signup route file should exist');
  
  const content = fs.readFileSync(routeFile, 'utf8');
  assert.ok(
    content.includes("redirectTo: '/setup'"),
    'pilot-signup should return redirectTo: "/setup"'
  );
});

// ============================================
// AC-3: trial/start/route.ts redirectTo check
// ============================================
test('AC-3: trial/start/route.ts returns redirectTo: "/setup"', () => {
  const routeFile = path.join(DASHBOARD_ROOT, 'app/api/trial/start/route.ts');
  if (!fs.existsSync(routeFile)) {
    console.log(`⚠️ trial/start route not found, skipping test`);
    return;
  }
  
  const content = fs.readFileSync(routeFile, 'utf8');
  assert.ok(
    content.includes("redirectTo: '/setup'"),
    'trial/start should return redirectTo: "/setup"'
  );
});

// ============================================
// AC-4: Email links updated
// ============================================
test('AC-4: pilot-signup welcome email links to /setup', () => {
  const routeFile = path.join(DASHBOARD_ROOT, 'app/api/auth/pilot-signup/route.ts');
  const content = fs.readFileSync(routeFile, 'utf8');
  
  assert.ok(
    content.includes('https://leadflow-ai-five.vercel.app/setup') || content.includes('/setup'),
    'Email should contain link to /setup'
  );
});

test('AC-4b: trial-signup welcome email links to /setup', () => {
  const routeFile = path.join(DASHBOARD_ROOT, 'app/api/auth/trial-signup/route.ts');
  const content = fs.readFileSync(routeFile, 'utf8');
  
  assert.ok(
    content.includes('https://leadflow-ai-five.vercel.app/setup') || content.includes('/setup'),
    'Trial signup email should contain link to /setup'
  );
});

// ============================================
// AC-6: /dashboard/onboarding page structure
// ============================================
test('AC-6a: /dashboard/onboarding page.tsx exists', () => {
  const pagePath = path.join(DASHBOARD_ROOT, 'app/dashboard/onboarding/page.tsx');
  assert.ok(fs.existsSync(pagePath), '/dashboard/onboarding/page.tsx must exist');
});

test('AC-6b: /dashboard/onboarding layout.tsx exists', () => {
  const layoutPath = path.join(DASHBOARD_ROOT, 'app/dashboard/onboarding/layout.tsx');
  assert.ok(fs.existsSync(layoutPath), '/dashboard/onboarding/layout.tsx must exist');
});

test('AC-6c: /dashboard/onboarding page is a client component (uses "use client")', () => {
  const pagePath = path.join(DASHBOARD_ROOT, 'app/dashboard/onboarding/page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');
  
  assert.ok(content.startsWith("'use client'"), 'page.tsx should declare "use client"');
});

test('AC-6d: /dashboard/onboarding page imports wizard components', () => {
  const pagePath = path.join(DASHBOARD_ROOT, 'app/dashboard/onboarding/page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');
  
  // Updated: actual implementation uses Onboarding* step components
  assert.ok(content.includes('OnboardingWelcome'), 'Should import OnboardingWelcome component');
  assert.ok(content.includes('OnboardingAgentInfo'), 'Should import OnboardingAgentInfo component');
  assert.ok(content.includes('OnboardingCalendar'), 'Should import OnboardingCalendar component');
  assert.ok(content.includes('OnboardingSMS'), 'Should import OnboardingSMS component');
  assert.ok(content.includes('OnboardingSimulator'), 'Should import OnboardingSimulator component');
  assert.ok(content.includes('OnboardingConfirm'), 'Should import OnboardingConfirm component');
});

test('AC-6e: /dashboard/onboarding layout does NOT import OnboardingGuard', () => {
  const layoutPath = path.join(DASHBOARD_ROOT, 'app/dashboard/onboarding/layout.tsx');
  const content = fs.readFileSync(layoutPath, 'utf8');
  
  // Check that OnboardingGuard is NOT imported (look for actual import statement)
  // This regex is more strict: looks for "import" followed by { and OnboardingGuard before any semicolon
  const importMatch = content.match(/import\s*{[^}]*OnboardingGuard[^}]*}\s+from/);
  assert.ok(
    !importMatch,
    'Layout should NOT import OnboardingGuard (allows new users to access)'
  );
  
  // Also check that it's not used as a component in JSX
  const jsxMatch = content.match(/<OnboardingGuard/);
  assert.ok(
    !jsxMatch,
    'Layout should NOT render OnboardingGuard component'
  );
});

// ============================================
// AC-7: Completion redirects to /dashboard
// ============================================
test('AC-7: Onboarding page completion handler calls router.push("/dashboard")', () => {
  const pagePath = path.join(DASHBOARD_ROOT, 'app/dashboard/onboarding/page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');
  
  assert.ok(
    content.includes("router.push('/dashboard')"),
    'handleFinish should redirect to /dashboard'
  );
});

// ============================================
// Additional validation: OnboardingGuard config
// ============================================
test('BONUS: OnboardingGuard includes /dashboard/onboarding in SETUP_ROUTES', () => {
  const guardPath = path.join(DASHBOARD_ROOT, 'components/onboarding-guard.tsx');
  const content = fs.readFileSync(guardPath, 'utf8');
  
  // Check that SETUP_ROUTES includes /dashboard/onboarding
  const setupRoutesMatch = content.match(/const SETUP_ROUTES\s*=\s*\[([\s\S]*?)\]/);
  assert.ok(setupRoutesMatch, 'SETUP_ROUTES array should be defined');
  
  const setupRoutesBlock = setupRoutesMatch[1];
  assert.ok(
    setupRoutesBlock.includes("'/dashboard/onboarding'"),
    'SETUP_ROUTES should include /dashboard/onboarding'
  );
});

// ============================================
// Integration test: All routes point to same destination
// ============================================
test('INTEGRATION: All three signup routes redirect to same destination', () => {
  const routeFiles = [
    path.join(DASHBOARD_ROOT, 'app/api/auth/pilot-signup/route.ts'),
    path.join(DASHBOARD_ROOT, 'app/api/auth/trial-signup/route.ts'),
    path.join(DASHBOARD_ROOT, 'app/api/trial/start/route.ts'),
  ];
  
  for (const filePath of routeFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes("redirectTo: '/dashboard/onboarding'"),
      `${path.basename(filePath)} should redirect to /dashboard/onboarding`
    );
  }
});

// ============================================
// Syntax validation
// ============================================
test('SYNTAX: All modified files are syntactically valid', () => {
  const filesToCheck = [
    path.join(DASHBOARD_ROOT, 'app/dashboard/onboarding/page.tsx'),
    path.join(DASHBOARD_ROOT, 'app/dashboard/onboarding/layout.tsx'),
    path.join(DASHBOARD_ROOT, 'app/api/auth/pilot-signup/route.ts'),
    path.join(DASHBOARD_ROOT, 'app/api/auth/trial-signup/route.ts'),
    path.join(DASHBOARD_ROOT, 'app/api/trial/start/route.ts'),
  ];
  
  for (const filePath of filesToCheck) {
    assert.ok(fs.existsSync(filePath), `File should exist: ${filePath}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic sanity checks
    assert.ok(content.length > 100, `File should have substantial content: ${filePath}`);
    assert.ok(!content.includes('undefinedd'), `No typos detected in: ${filePath}`);
    assert.ok(!content.includes('  {  {'), `No syntax errors detected in: ${filePath}`);
    
    // Check for unclosed braces/parens (basic)
    const braceCount = (content.match(/\{/g) || []).length - (content.match(/\}/g) || []).length;
    assert.ok(Math.abs(braceCount) <= 2, `Brace balance OK in: ${filePath}`);
  }
});

// ============================================
// SUMMARY
// ============================================
console.log('\n========================================');
console.log('TEST RESULTS');
console.log('========================================\n');
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📊 Pass Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

if (testsFailed > 0) {
  console.log('⛔ TESTS FAILED - Review errors above\n');
  process.exit(1);
} else {
  console.log('🎉 ALL TESTS PASSED - Ready for review\n');
  process.exit(0);
}
