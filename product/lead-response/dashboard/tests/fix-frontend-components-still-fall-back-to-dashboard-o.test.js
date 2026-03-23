/**
 * E2E Test for: fix-frontend-components-still-fall-back-to-dashboard-o
 * Task: 2082ee0d-21e4-47cc-8979-1d623bdb43b3
 * 
 * Verifies that:
 * 1. Frontend components use /setup as fallback (not /dashboard/onboarding)
 * 2. API routes return /setup as redirectTo (not /dashboard/onboarding)
 * 3. No hardcoded references to /dashboard/onboarding remain in auth flow
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DASHBOARD_DIR = path.join(__dirname, '..');

// Colors for output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

function log(message, isError = false) {
  console.log(`${isError ? RED : ''}${message}${RESET}`);
}

function test(name, fn) {
  try {
    fn();
    log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    log(`  ✗ ${name}: ${err.message}`, true);
    return false;
  }
}

async function runTests() {
  console.log('\n=== Frontend Components Fallback Redirect E2E Test ===\n');
  
  let passed = 0;
  let total = 0;

  // Test 1: Check pilot-signup-form.tsx uses /setup fallback
  total++;
  const pilotFormPath = path.join(DASHBOARD_DIR, 'components/pilot-signup-form.tsx');
  const pilotFormContent = fs.readFileSync(pilotFormPath, 'utf8');
  
  if (test('pilot-signup-form.tsx uses /setup as fallback', () => {
    // Should have /setup fallback
    assert(pilotFormContent.includes("router.push(data.redirectTo || '/setup')"), 
      'Missing /setup fallback in pilot-signup-form');
    // Should NOT have /dashboard/onboarding fallback
    assert(!pilotFormContent.includes("router.push(data.redirectTo || '/dashboard/onboarding')"),
      'Still has /dashboard/onboarding fallback in pilot-signup-form');
  })) passed++;

  // Test 2: Check trial-signup-form.tsx uses /setup fallback
  total++;
  const trialFormPath = path.join(DASHBOARD_DIR, 'components/trial-signup-form.tsx');
  const trialFormContent = fs.readFileSync(trialFormPath, 'utf8');
  
  if (test('trial-signup-form.tsx uses /setup as fallback', () => {
    // Should have /setup fallback
    assert(trialFormContent.includes("router.push(data.redirectTo || '/setup')"),
      'Missing /setup fallback in trial-signup-form');
    // Should NOT have /dashboard/onboarding fallback
    assert(!trialFormContent.includes("router.push(data.redirectTo || '/dashboard/onboarding')"),
      'Still has /dashboard/onboarding fallback in trial-signup-form');
  })) passed++;

  // Test 3: Check pilot-signup API route returns /setup
  total++;
  const pilotApiPath = path.join(DASHBOARD_DIR, 'app/api/auth/pilot-signup/route.ts');
  const pilotApiContent = fs.readFileSync(pilotApiPath, 'utf8');
  
  if (test('pilot-signup API returns /setup as redirectTo', () => {
    // Should return /setup
    assert(pilotApiContent.includes("redirectTo: '/setup'"),
      'API should return redirectTo: /setup');
    // Should NOT return /dashboard/onboarding
    assert(!pilotApiContent.includes("redirectTo: '/dashboard/onboarding'"),
      'API still returns /dashboard/onboarding');
  })) passed++;

  // Test 4: Check welcome email uses /setup link
  total++;
  if (test('pilot-signup welcome email uses /setup link', () => {
    // Welcome email should link to /setup not /dashboard/onboarding
    assert(!pilotApiContent.includes('/dashboard/onboarding'),
      'Welcome email still contains /dashboard/onboarding link');
  })) passed++;

  // Test 5: Verify no other files reference /dashboard/onboarding in auth flow
  total++;
  const authDir = path.join(DASHBOARD_DIR, 'app/api/auth');
  const componentsDir = path.join(DASHBOARD_DIR, 'components');
  
  if (test('No /dashboard/onboarding references in auth flow', () => {
    function checkDir(dirPath, label) {
      if (!fs.existsSync(dirPath)) return;
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          checkDir(fullPath, label);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('/dashboard/onboarding')) {
            throw new Error(`Found /dashboard/onboarding in ${fullPath}`);
          }
        }
      }
    }
    
    checkDir(authDir, 'auth');
    checkDir(componentsDir, 'components');
  })) passed++;

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    log('\n✓ All tests passed!', false);
    process.exit(0);
  } else {
    log('\n✗ Some tests failed', true);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
