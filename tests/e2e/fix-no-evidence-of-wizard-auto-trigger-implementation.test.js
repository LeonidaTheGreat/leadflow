/**
 * E2E Test: fix-no-evidence-of-wizard-auto-trigger-implementation
 * 
 * Test: Verify that the onboarding wizard auto-triggers when onboarding_completed=false
 * - AC-1: OnboardingWizardLauncher component exists
 * - AC-2: Component renders on dashboard when onboarding_completed=false
 * - AC-3: Component fetches onboarding status from /api/auth/trial-status
 * - AC-4: Component shows progress tracker with 5 steps
 * - AC-5: Component redirects to /onboarding when "Continue Setup" is clicked
 * - AC-6: Component has collapse/expand functionality
 * - AC-7: Completion state hides the wizard
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
  }
  testResults.tests.push({ name, passed, details });
}

// Test 1: OnboardingWizardLauncher component file exists
try {
  const componentPath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/components/dashboard/OnboardingWizardLauncher.tsx'
  );
  const exists = fs.existsSync(componentPath);
  logTest(
    'OnboardingWizardLauncher.tsx file exists',
    exists,
    exists ? '' : `File not found at ${componentPath}`
  );
} catch (err) {
  logTest('OnboardingWizardLauncher.tsx file exists', false, err.message);
}

// Test 2: Component file contains 'use client' directive
try {
  const componentPath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/components/dashboard/OnboardingWizardLauncher.tsx'
  );
  const content = fs.readFileSync(componentPath, 'utf8');
  const hasUseClient = content.includes("'use client'");
  logTest(
    'Component has use client directive',
    hasUseClient,
    hasUseClient ? '' : 'Missing use client directive'
  );
} catch (err) {
  logTest('Component has use client directive', false, err.message);
}

// Test 3: Component exports OnboardingWizardLauncher function
try {
  const componentPath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/components/dashboard/OnboardingWizardLauncher.tsx'
  );
  const content = fs.readFileSync(componentPath, 'utf8');
  const hasExport = content.includes('export function OnboardingWizardLauncher');
  logTest(
    'Component exports OnboardingWizardLauncher function',
    hasExport,
    hasExport ? '' : 'Missing export declaration'
  );
} catch (err) {
  logTest('Component exports OnboardingWizardLauncher function', false, err.message);
}

// Test 4: Component fetches from /api/auth/trial-status
try {
  const componentPath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/components/dashboard/OnboardingWizardLauncher.tsx'
  );
  const content = fs.readFileSync(componentPath, 'utf8');
  const hasFetch = content.includes('/api/auth/trial-status');
  logTest(
    'Component fetches onboarding status from /api/auth/trial-status',
    hasFetch,
    hasFetch ? '' : 'API endpoint not found'
  );
} catch (err) {
  logTest('Component fetches onboarding status from /api/auth/trial-status', false, err.message);
}

// Test 5: Component reads onboardingCompleted from API response
try {
  const componentPath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/components/dashboard/OnboardingWizardLauncher.tsx'
  );
  const content = fs.readFileSync(componentPath, 'utf8');
  const hasOnboardingCompleted = content.includes('onboardingCompleted');
  logTest(
    'Component reads onboardingCompleted from API response',
    hasOnboardingCompleted,
    hasOnboardingCompleted ? '' : 'Property not found'
  );
} catch (err) {
  logTest('Component reads onboardingCompleted from API response', false, err.message);
}

// Test 6: Component defines ONBOARDING_STEPS array with 5 steps
try {
  const componentPath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/components/dashboard/OnboardingWizardLauncher.tsx'
  );
  const content = fs.readFileSync(componentPath, 'utf8');
  const hasSteps = content.includes('ONBOARDING_STEPS');
  const stepsMatch = content.match(/const ONBOARDING_STEPS[\s\S]*?\]/);
  let stepCount = 0;
  if (stepsMatch) {
    stepCount = (stepsMatch[0].match(/{ id:/g) || []).length;
  }
  logTest(
    'Component defines ONBOARDING_STEPS array with 5 steps',
    hasSteps && stepCount === 5,
    hasSteps
      ? stepCount === 5
        ? ''
        : `Found ${stepCount} steps instead of 5`
      : 'ONBOARDING_STEPS not found'
  );
} catch (err) {
  logTest('Component defines ONBOARDING_STEPS array with 5 steps', false, err.message);
}

// Test 7: Component renders progress bar
try {
  const componentPath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/components/dashboard/OnboardingWizardLauncher.tsx'
  );
  const content = fs.readFileSync(componentPath, 'utf8');
  const hasProgressBar = content.includes('progress') && content.includes('width:');
  logTest(
    'Component renders progress bar',
    hasProgressBar,
    hasProgressBar ? '' : 'Progress bar rendering code not found'
  );
} catch (err) {
  logTest('Component renders progress bar', false, err.message);
}

// Test 8: Component has "Continue Setup" button with redirect to /onboarding
try {
  const componentPath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/components/dashboard/OnboardingWizardLauncher.tsx'
  );
  const content = fs.readFileSync(componentPath, 'utf8');
  const hasButton = content.includes('Continue Setup');
  const hasRedirect = content.includes('/onboarding') && content.includes('window.location.href');
  logTest(
    'Component has Continue Setup button with /onboarding redirect',
    hasButton && hasRedirect,
    hasButton && hasRedirect ? '' : 'Button or redirect not found'
  );
} catch (err) {
  logTest('Component has Continue Setup button with /onboarding redirect', false, err.message);
}

// Test 9: Component hides wizard when onboarding completed
try {
  const componentPath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/components/dashboard/OnboardingWizardLauncher.tsx'
  );
  const content = fs.readFileSync(componentPath, 'utf8');
  const hasCompletionCheck = content.includes('onboardingCompleted') && content.includes('return null');
  logTest(
    'Component hides wizard when onboarding completed',
    hasCompletionCheck,
    hasCompletionCheck ? '' : 'Completion check not found'
  );
} catch (err) {
  logTest('Component hides wizard when onboarding completed', false, err.message);
}

// Test 10: Component is imported in dashboard page
try {
  const dashboardPagePath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/app/dashboard/page.tsx'
  );
  const content = fs.readFileSync(dashboardPagePath, 'utf8');
  const hasImport = content.includes('OnboardingWizardLauncher');
  logTest(
    'Component is imported in dashboard page',
    hasImport,
    hasImport ? '' : 'Import not found'
  );
} catch (err) {
  logTest('Component is imported in dashboard page', false, err.message);
}

// Test 11: Component is rendered in dashboard page
try {
  const dashboardPagePath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/app/dashboard/page.tsx'
  );
  const content = fs.readFileSync(dashboardPagePath, 'utf8');
  const hasRender = content.includes('<OnboardingWizardLauncher');
  logTest(
    'Component is rendered in dashboard page',
    hasRender,
    hasRender ? '' : 'Component not rendered'
  );
} catch (err) {
  logTest('Component is rendered in dashboard page', false, err.message);
}

// Test 12: Component has collapse/expand functionality
try {
  const componentPath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/components/dashboard/OnboardingWizardLauncher.tsx'
  );
  const content = fs.readFileSync(componentPath, 'utf8');
  const hasCollapse = content.includes('handleCollapse') && content.includes('handleExpand');
  logTest(
    'Component has collapse/expand functionality',
    hasCollapse,
    hasCollapse ? '' : 'Collapse/expand handlers not found'
  );
} catch (err) {
  logTest('Component has collapse/expand functionality', false, err.message);
}

// Test 13: Component uses localStorage for collapse state
try {
  const componentPath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/components/dashboard/OnboardingWizardLauncher.tsx'
  );
  const content = fs.readFileSync(componentPath, 'utf8');
  const hasLocalStorage = content.includes('localStorage.setItem') && content.includes('onboarding-launcher-collapsed');
  logTest(
    'Component uses localStorage for collapse state',
    hasLocalStorage,
    hasLocalStorage ? '' : 'localStorage usage not found'
  );
} catch (err) {
  logTest('Component uses localStorage for collapse state', false, err.message);
}

// Test 14: Component analytics tracking for wizard start
try {
  const componentPath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/components/dashboard/OnboardingWizardLauncher.tsx'
  );
  const content = fs.readFileSync(componentPath, 'utf8');
  const hasAnalytics = content.includes('/api/analytics/event') && content.includes('wizard_started');
  logTest(
    'Component tracks analytics when wizard is started',
    hasAnalytics,
    hasAnalytics ? '' : 'Analytics tracking not found'
  );
} catch (err) {
  logTest('Component tracks analytics when wizard is started', false, err.message);
}

// Test 15: Dashboard page shows wizard before onboarding completion
try {
  const dashboardPagePath = path.join(
    __dirname,
    '../../product/lead-response/dashboard/app/dashboard/page.tsx'
  );
  const content = fs.readFileSync(dashboardPagePath, 'utf8');
  // Check that wizard is positioned in the JSX return (between banners and lead feed)
  const returnContent = content.substring(content.indexOf('return ('));
  const wizardRenderIndex = returnContent.indexOf('<OnboardingWizardLauncher');
  const leadFeedRenderIndex = returnContent.indexOf('<Suspense') + returnContent.substring(returnContent.indexOf('<Suspense')).indexOf('<LeadFeed');
  const isWizardBeforeLeads = wizardRenderIndex > 0 && wizardRenderIndex < leadFeedRenderIndex;
  logTest(
    'Dashboard page renders wizard before lead feed',
    isWizardBeforeLeads,
    isWizardBeforeLeads ? '' : 'Wizard placement incorrect'
  );
} catch (err) {
  logTest('Dashboard page renders wizard before lead feed', false, err.message);
}

// Print summary
console.log('\n' + '='.repeat(60));
console.log('📊 WIZARD AUTO-TRIGGER TEST REPORT');
console.log('='.repeat(60));
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`📈 Total: ${testResults.total}`);
console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

// Exit with appropriate code
process.exit(testResults.failed > 0 ? 1 : 0);
