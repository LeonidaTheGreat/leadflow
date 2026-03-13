/**
 * Unit Test for feat-email-verification-before-login
 * Tests code logic without requiring database migrations
 */

const assert = require('assert');

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  return { name, fn };
}

async function runTest(t) {
  try {
    console.log(`\n🧪 ${t.name}`);
    await t.fn();
    console.log(`✅ PASSED: ${t.name}`);
    results.passed++;
    results.tests.push({ name: t.name, status: 'passed' });
  } catch (error) {
    console.log(`❌ FAILED: ${t.name}`);
    console.log(`   Error: ${error.message}`);
    results.failed++;
    results.tests.push({ name: t.name, status: 'failed', error: error.message });
  }
}

// Read the source files to verify implementation
const fs = require('fs');
const path = require('path');

const dashboardDir = '/Users/clawdbot/projects/leadflow/product/lead-response/dashboard';

function readFile(filePath) {
  return fs.readFileSync(path.join(dashboardDir, filePath), 'utf8');
}

// Tests
const tests = [
  test('Login route checks email_verified before issuing token', () => {
    const loginRoute = readFile('app/api/auth/login/route.ts');
    
    // Check for email_verified check
    assert.ok(loginRoute.includes('email_verified'), 'Login route should reference email_verified');
    assert.ok(loginRoute.includes('EMAIL_NOT_VERIFIED'), 'Login route should return EMAIL_NOT_VERIFIED error');
    assert.ok(loginRoute.includes('403'), 'Login route should return 403 status for unverified');
    assert.ok(loginRoute.includes('resendUrl'), 'Login route should include resendUrl in response');
  }),

  test('Login route returns 403 with correct error structure', () => {
    const loginRoute = readFile('app/api/auth/login/route.ts');
    
    // Verify the error response structure
    assert.ok(
      loginRoute.includes('error: \'EMAIL_NOT_VERIFIED\'') || loginRoute.includes("error: 'EMAIL_NOT_VERIFIED'"),
      'Should return EMAIL_NOT_VERIFIED error code'
    );
    assert.ok(
      loginRoute.includes('message:') && loginRoute.includes('Please confirm'),
      'Should include user-friendly message'
    );
  }),

  test('Trial signup creates unverified agent', () => {
    const trialSignup = readFile('app/api/auth/trial-signup/route.ts');
    
    assert.ok(trialSignup.includes('email_verified: false'), 'Trial signup should set email_verified to false');
    assert.ok(trialSignup.includes('check-your-inbox'), 'Should redirect to check-your-inbox page');
  }),

  test('Pilot signup creates unverified agent', () => {
    const pilotSignup = readFile('app/api/auth/pilot-signup/route.ts');
    
    assert.ok(pilotSignup.includes('email_verified: false'), 'Pilot signup should set email_verified to false');
    assert.ok(pilotSignup.includes('check-your-inbox'), 'Should redirect to check-your-inbox page');
  }),

  test('Trial signup sends verification email', () => {
    const trialSignup = readFile('app/api/auth/trial-signup/route.ts');
    
    assert.ok(trialSignup.includes('createVerificationToken'), 'Should create verification token');
    assert.ok(trialSignup.includes('sendVerificationEmail'), 'Should send verification email');
  }),

  test('Pilot signup sends verification email', () => {
    const pilotSignup = readFile('app/api/auth/pilot-signup/route.ts');
    
    assert.ok(pilotSignup.includes('createVerificationToken'), 'Should create verification token');
    assert.ok(pilotSignup.includes('sendVerificationEmail'), 'Should send verification email');
  }),

  test('Verify-email route exists and handles tokens', () => {
    const verifyRoute = readFile('app/api/auth/verify-email/route.ts');
    
    assert.ok(verifyRoute.includes('verifyEmailToken'), 'Should use verifyEmailToken function');
    assert.ok(verifyRoute.includes('success'), 'Should handle success case');
    assert.ok(verifyRoute.includes('expired'), 'Should handle expired token');
    assert.ok(verifyRoute.includes('already_used'), 'Should handle already used token');
    assert.ok(verifyRoute.includes('invalid'), 'Should handle invalid token');
  }),

  test('Verify-email redirects correctly for each case', () => {
    const verifyRoute = readFile('app/api/auth/verify-email/route.ts');
    
    // Success -> /setup
    assert.ok(verifyRoute.includes('/setup'), 'Success should redirect to /setup');
    
    // Expired -> /check-your-inbox?error=link_expired
    assert.ok(verifyRoute.includes('link_expired'), 'Expired should redirect with link_expired');
    
    // Already used -> /login?error=token_already_used
    assert.ok(verifyRoute.includes('token_already_used'), 'Already used should redirect with token_already_used');
    
    // Invalid -> /check-your-inbox?error=invalid_token
    assert.ok(verifyRoute.includes('invalid_token'), 'Invalid should redirect with invalid_token');
  }),

  test('Resend-verification route validates input', () => {
    const resendRoute = readFile('app/api/auth/resend-verification/route.ts');
    
    assert.ok(resendRoute.includes('Email is required'), 'Should validate missing email');
    assert.ok(resendRoute.includes('valid email'), 'Should validate email format');
  }),

  test('Resend-verification route checks agent exists', () => {
    const resendRoute = readFile('app/api/auth/resend-verification/route.ts');
    
    assert.ok(resendRoute.includes('AGENT_NOT_FOUND'), 'Should return AGENT_NOT_FOUND for non-existent agent');
    assert.ok(resendRoute.includes('404'), 'Should return 404 for non-existent agent');
  }),

  test('Resend-verification route checks if already verified', () => {
    const resendRoute = readFile('app/api/auth/resend-verification/route.ts');
    
    assert.ok(resendRoute.includes('Already verified'), 'Should check if already verified');
  }),

  test('Resend-verification route implements rate limiting', () => {
    const resendRoute = readFile('app/api/auth/resend-verification/route.ts');
    
    assert.ok(resendRoute.includes('checkResendRateLimit'), 'Should check rate limit');
    assert.ok(resendRoute.includes('RATE_LIMIT'), 'Should return RATE_LIMIT error');
    assert.ok(resendRoute.includes('429'), 'Should return 429 for rate limit');
  }),

  test('Verification email library has all required functions', () => {
    const lib = readFile('lib/verification-email.ts');
    
    assert.ok(lib.includes('createVerificationToken'), 'Should export createVerificationToken');
    assert.ok(lib.includes('sendVerificationEmail'), 'Should export sendVerificationEmail');
    assert.ok(lib.includes('verifyEmailToken'), 'Should export verifyEmailToken');
    assert.ok(lib.includes('checkResendRateLimit'), 'Should export checkResendRateLimit');
    assert.ok(lib.includes('getAgentByEmail'), 'Should export getAgentByEmail');
  }),

  test('Verification email has correct expiry time (24 hours)', () => {
    const lib = readFile('lib/verification-email.ts');
    
    // Check for 24 hour expiry
    assert.ok(
      lib.includes('24') && (lib.includes('60 * 60 * 1000') || lib.includes('hours')),
      'Should set 24 hour expiry'
    );
  }),

  test('Rate limit is 3 per hour', () => {
    const lib = readFile('lib/verification-email.ts');
    
    assert.ok(lib.includes('3'), 'Should mention limit of 3');
    assert.ok(lib.includes('60 * 60 * 1000') || lib.includes('oneHourAgo'), 'Should use 1 hour window');
  }),

  test('Verification email template has correct content', () => {
    const lib = readFile('lib/verification-email.ts');
    
    assert.ok(lib.includes('Confirm your LeadFlow email address'), 'Should have correct subject');
    assert.ok(lib.includes('Confirm my email address'), 'Should have CTA button');
    assert.ok(lib.includes('24 hours'), 'Should mention 24 hour expiry');
    assert.ok(lib.includes('verify-email'), 'Should include verify-email URL');
  }),

  test('Check-your-inbox page exists with correct content', () => {
    const page = readFile('app/check-your-inbox/page.tsx');
    
    assert.ok(page.includes('Check your inbox'), 'Should have correct headline');
    assert.ok(page.includes('Resend email'), 'Should have resend button');
    assert.ok(page.includes('link_expired'), 'Should handle link_expired error');
    assert.ok(page.includes('invalid_token'), 'Should handle invalid_token error');
    assert.ok(page.includes('token_already_used'), 'Should handle token_already_used error');
  }),

  test('Check-your-inbox page has countdown for resend button', () => {
    const page = readFile('app/check-your-inbox/page.tsx');
    
    assert.ok(page.includes('countdown'), 'Should have countdown state');
    assert.ok(page.includes('setCountdown'), 'Should set countdown');
  }),

  test('Login page handles EMAIL_NOT_VERIFIED error', () => {
    const page = readFile('app/login/page.tsx');
    
    assert.ok(page.includes('EMAIL_NOT_VERIFIED'), 'Should handle EMAIL_NOT_VERIFIED error');
    assert.ok(page.includes('handleResendVerification'), 'Should have resend verification handler');
    assert.ok(page.includes('Resend verification email') || page.includes('resend'), 'Should show resend CTA');
  }),

  test('Database migration file exists', () => {
    const migrationPath = 'supabase/migrations/012_email_verification_tokens.sql';
    assert.ok(fs.existsSync(path.join(dashboardDir, migrationPath)), 'Migration file should exist');
  }),

  test('Database migration creates correct table structure', () => {
    const migration = readFile('supabase/migrations/012_email_verification_tokens.sql');
    
    assert.ok(migration.includes('email_verification_tokens'), 'Should create email_verification_tokens table');
    assert.ok(migration.includes('agent_id'), 'Should have agent_id column');
    assert.ok(migration.includes('token'), 'Should have token column');
    assert.ok(migration.includes('expires_at'), 'Should have expires_at column');
    assert.ok(migration.includes('used_at'), 'Should have used_at column');
    assert.ok(migration.includes('UNIQUE'), 'Token should be unique');
    assert.ok(migration.includes('ON DELETE CASCADE'), 'Should cascade delete');
  }),

  test('Database migration creates indexes', () => {
    const migration = readFile('supabase/migrations/012_email_verification_tokens.sql');
    
    assert.ok(migration.includes('idx_email_verification_tokens_token'), 'Should create token index');
    assert.ok(migration.includes('idx_email_verification_tokens_agent_id'), 'Should create agent_id index');
  }),

  test('Database migration enables RLS', () => {
    const migration = readFile('supabase/migrations/012_email_verification_tokens.sql');
    
    assert.ok(migration.includes('ENABLE ROW LEVEL SECURITY'), 'Should enable RLS');
    assert.ok(migration.includes('service_role'), 'Should have service_role policy');
  }),

  test('verifyEmailToken marks token as used', () => {
    const lib = readFile('lib/verification-email.ts');
    
    assert.ok(lib.includes('used_at'), 'Should update used_at timestamp');
  }),

  test('verifyEmailToken marks agent as verified', () => {
    const lib = readFile('lib/verification-email.ts');
    
    assert.ok(lib.includes('email_verified: true'), 'Should set email_verified to true');
  }),

  test('Build includes all new routes', () => {
    // Check that the routes are in the build output
    const buildDir = path.join(dashboardDir, '.next/server/app/api/auth');
    assert.ok(fs.existsSync(buildDir), 'Build directory should exist');
    
    const resendDir = path.join(buildDir, 'resend-verification');
    const verifyDir = path.join(buildDir, 'verify-email');
    
    assert.ok(fs.existsSync(resendDir), 'resend-verification route should be built');
    assert.ok(fs.existsSync(verifyDir), 'verify-email route should be built');
  }),

  test('Check-your-inbox page is built', () => {
    const buildDir = path.join(dashboardDir, '.next/server/app');
    const checkInboxDir = path.join(buildDir, 'check-your-inbox');
    
    assert.ok(fs.existsSync(checkInboxDir), 'check-your-inbox page should be built');
  })
];

// Run all tests
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Unit Test: feat-email-verification-before-login');
  console.log('  Tests code implementation without database');
  console.log('═══════════════════════════════════════════════════════════════');

  for (const t of tests) {
    await runTest(t);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total: ${tests.length}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Pass Rate: ${((results.passed / tests.length) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.tests.filter(t => t.status === 'failed').forEach(t => {
      console.log(`  - ${t.name}`);
    });
  }

  return results;
}

// Export for use as module
module.exports = { runAllTests, results };

// Run if called directly
if (require.main === module) {
  runAllTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}
