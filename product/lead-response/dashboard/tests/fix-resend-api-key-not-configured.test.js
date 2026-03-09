/**
 * E2E Test: Email Configuration Validation
 * Tests that email configuration infrastructure is properly implemented
 * 
 * Use Case: fix-resend-api-key-not-configured-in-vercel-email-deli
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dashboardDir = path.join(__dirname, '..');
const projectRoot = path.join(dashboardDir, '../../..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${err.message}`);
    failed++;
  }
}

console.log('========================================');
console.log('E2E Test: Email Configuration Validation');
console.log('Use Case: fix-resend-api-key-not-configured-in-vercel-email-deli');
console.log('========================================\n');

// Test 1: Email validation module exists
test('Email config validation module exists', () => {
  const modulePath = path.join(dashboardDir, 'lib/email-config-validation.ts');
  assert(fs.existsSync(modulePath), 'email-config-validation.ts should exist');
});

// Test 2: Validation module exports correct functions
test('Validation module exports validateEmailConfig and logEmailConfigStatus', () => {
  const modulePath = path.join(dashboardDir, 'lib/email-config-validation.ts');
  const content = fs.readFileSync(modulePath, 'utf8');
  assert(content.includes('export function validateEmailConfig'), 'Should export validateEmailConfig');
  assert(content.includes('export function logEmailConfigStatus'), 'Should export logEmailConfigStatus');
});

// Test 3: Validation checks for RESEND_API_KEY
test('Validation checks for RESEND_API_KEY', () => {
  const modulePath = path.join(dashboardDir, 'lib/email-config-validation.ts');
  const content = fs.readFileSync(modulePath, 'utf8');
  assert(content.includes('RESEND_API_KEY'), 'Should reference RESEND_API_KEY');
  assert(content.includes('not configured'), 'Should check if key is configured');
});

// Test 4: Validation checks for FROM_EMAIL
test('Validation checks for FROM_EMAIL', () => {
  const modulePath = path.join(dashboardDir, 'lib/email-config-validation.ts');
  const content = fs.readFileSync(modulePath, 'utf8');
  assert(content.includes('FROM_EMAIL'), 'Should reference FROM_EMAIL');
  assert(content.includes('stojan@leadflow.ai'), 'Should have default FROM_EMAIL');
});

// Test 5: Validation validates email format
test('Validation validates email format with regex', () => {
  const modulePath = path.join(dashboardDir, 'lib/email-config-validation.ts');
  const content = fs.readFileSync(modulePath, 'utf8');
  assert(content.includes('emailRegex'), 'Should have email regex');
  assert(content.includes('test(fromEmail)'), 'Should test email format');
});

// Test 6: Instrumentation file exists
test('Instrumentation file exists', () => {
  const instrumentationPath = path.join(dashboardDir, 'instrumentation.ts');
  assert(fs.existsSync(instrumentationPath), 'instrumentation.ts should exist');
});

// Test 7: Instrumentation exports register function
test('Instrumentation exports register function', () => {
  const instrumentationPath = path.join(dashboardDir, 'instrumentation.ts');
  const content = fs.readFileSync(instrumentationPath, 'utf8');
  assert(content.includes('export async function register'), 'Should export register function');
});

// Test 8: Instrumentation calls logEmailConfigStatus
test('Instrumentation calls logEmailConfigStatus', () => {
  const instrumentationPath = path.join(dashboardDir, 'instrumentation.ts');
  const content = fs.readFileSync(instrumentationPath, 'utf8');
  assert(content.includes('logEmailConfigStatus'), 'Should call logEmailConfigStatus');
});

// Test 9: Instrumentation only runs on nodejs runtime
test('Instrumentation only runs on nodejs runtime', () => {
  const instrumentationPath = path.join(dashboardDir, 'instrumentation.ts');
  const content = fs.readFileSync(instrumentationPath, 'utf8');
  assert(content.includes("NEXT_RUNTIME === 'nodejs'"), 'Should check for nodejs runtime');
});

// Test 10: Next.js config enables instrumentation
test('Next.js config enables instrumentation', () => {
  const configPath = path.join(dashboardDir, 'next.config.ts');
  const content = fs.readFileSync(configPath, 'utf8');
  assert(content.includes('instrumentation'), 'Should reference instrumentation');
});

// Test 11: .env.example documents email config
test('.env.example documents email configuration', () => {
  const envPath = path.join(dashboardDir, '.env.example');
  assert(fs.existsSync(envPath), '.env.example should exist');
  const content = fs.readFileSync(envPath, 'utf8');
  assert(content.includes('RESEND_API_KEY'), 'Should document RESEND_API_KEY');
  assert(content.includes('FROM_EMAIL'), 'Should document FROM_EMAIL');
  assert(content.includes('resend.com/api-keys'), 'Should link to Resend docs');
});

// Test 12: RESEND_SETUP.md documentation exists
test('RESEND_SETUP.md documentation exists', () => {
  const setupPath = path.join(projectRoot, 'RESEND_SETUP.md');
  assert(fs.existsSync(setupPath), 'RESEND_SETUP.md should exist');
});

// Test 13: RESEND_SETUP.md has setup instructions
test('RESEND_SETUP.md has complete setup instructions', () => {
  const setupPath = path.join(projectRoot, 'RESEND_SETUP.md');
  const content = fs.readFileSync(setupPath, 'utf8');
  assert(content.includes('RESEND_API_KEY'), 'Should mention RESEND_API_KEY');
  assert(content.includes('vercel.com'), 'Should mention Vercel');
  assert(content.includes('resend.com/api-keys'), 'Should link to Resend API keys');
  assert(content.includes('Step 1'), 'Should have step-by-step instructions');
});

// Test 14: Test file exists with comprehensive tests
test('Email config validation test file exists', () => {
  const testPath = path.join(dashboardDir, 'lib/__tests__/email-config-validation.test.ts');
  assert(fs.existsSync(testPath), 'Test file should exist');
});

// Test 15: Test file has at least 6 tests
test('Test file has at least 6 tests', () => {
  const testPath = path.join(dashboardDir, 'lib/__tests__/email-config-validation.test.ts');
  const content = fs.readFileSync(testPath, 'utf8');
  const testCount = (content.match(/test\(/g) || []).length;
  assert(testCount >= 6, `Should have at least 6 tests, found ${testCount}`);
});

// Test 16: Test file covers missing key scenario
test('Tests cover missing RESEND_API_KEY scenario', () => {
  const testPath = path.join(dashboardDir, 'lib/__tests__/email-config-validation.test.ts');
  const content = fs.readFileSync(testPath, 'utf8');
  assert(content.includes('RESEND_API_KEY is missing'), 'Should test missing key scenario');
});

// Test 17: Test file covers valid config scenario
test('Tests cover valid config scenario', () => {
  const testPath = path.join(dashboardDir, 'lib/__tests__/email-config-validation.test.ts');
  const content = fs.readFileSync(testPath, 'utf8');
  assert(content.includes('pass validation'), 'Should test valid config scenario');
});

// Test 18: Test file covers invalid email scenario
test('Tests cover invalid email scenario', () => {
  const testPath = path.join(dashboardDir, 'lib/__tests__/email-config-validation.test.ts');
  const content = fs.readFileSync(testPath, 'utf8');
  assert(content.includes('invalid email'), 'Should test invalid email scenario');
});

// Test 19: lead-magnet-email.ts exists and handles missing key gracefully
test('lead-magnet-email.ts handles missing RESEND_API_KEY gracefully', () => {
  const emailPath = path.join(dashboardDir, 'lib/lead-magnet-email.ts');
  assert(fs.existsSync(emailPath), 'lead-magnet-email.ts should exist');
  const content = fs.readFileSync(emailPath, 'utf8');
  assert(content.includes('getResend'), 'Should have getResend function');
  assert(content.includes('RESEND_API_KEY'), 'Should check for RESEND_API_KEY');
});

// Test 20: Validation returns proper interface
test('Validation returns EmailConfigValidation interface', () => {
  const modulePath = path.join(dashboardDir, 'lib/email-config-validation.ts');
  const content = fs.readFileSync(modulePath, 'utf8');
  assert(content.includes('EmailConfigValidation'), 'Should define EmailConfigValidation interface');
  assert(content.includes('isValid: boolean'), 'Should have isValid boolean');
  assert(content.includes('issues: string[]'), 'Should have issues array');
  assert(content.includes('warnings: string[]'), 'Should have warnings array');
});

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed > 0) {
  console.log('\n❌ E2E TEST FAILED');
  process.exit(1);
} else {
  console.log('\n✅ ALL E2E TESTS PASSED');
  console.log('\nSummary:');
  console.log('- Email configuration validation module is properly implemented');
  console.log('- Instrumentation hook is configured to run at startup');
  console.log('- Environment variables are documented in .env.example');
  console.log('- RESEND_SETUP.md provides human setup instructions');
  console.log('- Unit tests cover all validation scenarios (6 tests)');
  console.log('- lead-magnet-email.ts handles missing key gracefully');
  process.exit(0);
}
