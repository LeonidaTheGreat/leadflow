/**
 * QC E2E test: feat-conversion-call-booking — PR #1317
 * Task: 336bd406-51a4-488a-b3bb-b23c5723ec33
 *
 * Tests the security correctness of the admin auth change and CTA feature quality.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    return { passed: true, name };
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${error.message}`);
    return { passed: false, name, error: error.message };
  }
}

function readFile(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf-8');
}

const results = [];

// Test 1: timingSafeEqual has length guard to prevent 500 on wrong-length tokens
results.push(runTest('checkAdminAuth has byteLength guard before timingSafeEqual', () => {
  const content = readFile('app/api/admin/pilot-targets/[id]/invite/route.ts');
  assert(
    content.includes('byteLength') || content.includes('.length !==') || content.includes('.length !='),
    'crypto.timingSafeEqual is called without a buffer-length guard. ' +
    'If adminToken.length !== expectedToken.length, Node.js throws TypeError (ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH), ' +
    'returning 500 instead of 401/false. Fix: check a.byteLength !== b.byteLength before calling timingSafeEqual.'
  );
}));

// Test 2: No unused imports in trial-expired page
results.push(runTest('trial-expired page has no unused imports from lucide-react', () => {
  const content = readFile('app/dashboard/trial-expired/page.tsx');
  // Extract import names from the lucide-react import line
  const importMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  if (!importMatch) return; // no import at all is fine
  const importedNames = importMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  for (const name of importedNames) {
    // Count occurrences outside the import line itself
    const usageCount = (content.split(new RegExp(`\\b${name}\\b`)).length - 1) - 1; // subtract import declaration
    assert(usageCount > 0, `"${name}" is imported from lucide-react but never used in the JSX`);
  }
}));

// Test 3: Demo CTA links use env var with safe fallback (not hardcoded personal URL)
results.push(runTest('Demo CTA uses NEXT_PUBLIC_DEMO_BOOKING_URL env var (not hardcoded)', () => {
  const files = [
    'app/pricing/page.tsx',
    'app/settings/billing/page.tsx',
    'app/dashboard/trial-expired/page.tsx',
  ];
  for (const f of files) {
    const content = readFile(f);
    assert(
      content.includes('NEXT_PUBLIC_DEMO_BOOKING_URL'),
      `${f}: Demo CTA should use process.env.NEXT_PUBLIC_DEMO_BOOKING_URL, not a hardcoded URL`
    );
  }
}));

// Test 4: CTA links have rel="noopener noreferrer" (security — external link)
results.push(runTest('All demo CTA links have rel=noopener noreferrer', () => {
  const files = [
    ['app/pricing/page.tsx', 'demo-call-cta-pricing'],
    ['app/settings/billing/page.tsx', 'demo-call-cta-billing'],
    ['app/dashboard/trial-expired/page.tsx', 'demo-call-cta-trial-expired'],
  ];
  for (const [f, testid] of files) {
    const content = readFile(f);
    // Find the block containing the testid and check it has noopener
    const ctaIdx = content.indexOf(testid);
    assert(ctaIdx !== -1, `${f}: Missing data-testid="${testid}"`);
    const surroundingBlock = content.slice(Math.max(0, ctaIdx - 200), ctaIdx + 200);
    assert(
      surroundingBlock.includes('noopener') && surroundingBlock.includes('noreferrer'),
      `${f}: External CTA link with testid="${testid}" is missing rel="noopener noreferrer"`
    );
  }
}));

// Test 5: Build output verified — env.example documents new var
results.push(runTest('.env.example documents NEXT_PUBLIC_DEMO_BOOKING_URL with example value', () => {
  const content = readFile('.env.example');
  const match = content.match(/NEXT_PUBLIC_DEMO_BOOKING_URL=(.+)/);
  assert(match, 'NEXT_PUBLIC_DEMO_BOOKING_URL not found in .env.example');
  const val = match[1].trim();
  assert(val.startsWith('https://'), `NEXT_PUBLIC_DEMO_BOOKING_URL example value should be a full URL, got: "${val}"`);
}));

// Summary
const passed = results.filter(r => r.passed).length;
const total = results.length;

console.log(`\n=== QC Test Summary ===`);
console.log(`Passed: ${passed}/${total}`);
console.log(`Pass Rate: ${(passed / total * 100).toFixed(0)}%`);

if (passed === total) {
  console.log('\n✅ All QC tests passed!');
  process.exit(0);
} else {
  console.log('\n❌ QC tests failed — PR has issues that must be fixed.');
  process.exit(1);
}
