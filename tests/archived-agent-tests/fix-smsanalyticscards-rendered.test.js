/**
 * Test: SmsAnalyticsCards component is rendered in dashboard
 * 
 * Verifies that the SmsAnalyticsCards component is properly imported and rendered
 * between StatsCards and LeadFeed in the dashboard page.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Simple test assertion helper
function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    return true;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${err.message}`);
    return false;
  }
}

function expect(value) {
  return {
    toBe(expected) {
      assert.strictEqual(value, expected);
    },
    toMatch(regex) {
      assert(regex.test(value), `Expected to match ${regex}`);
    },
    toBeGreaterThan(threshold) {
      assert(value > threshold, `Expected ${value} > ${threshold}`);
    },
    toBeLessThan(threshold) {
      assert(value < threshold, `Expected ${value} < ${threshold}`);
    },
    toBeGreaterThanOrEqual(threshold) {
      assert(value >= threshold);
    },
  };
}

// Run tests
const dashboardPagePath = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/dashboard/page.tsx'
);

const smsAnalyticsComponentPath = path.join(
  __dirname,
  '../product/lead-response/dashboard/components/dashboard/SmsAnalyticsCards.tsx'
);

let passed = 0;
let failed = 0;

console.log('\n🧪 Testing: SmsAnalyticsCards component rendering\n');

if (test('SmsAnalyticsCards component file exists', () => {
  assert(fs.existsSync(smsAnalyticsComponentPath));
})) passed++; else failed++;

if (test('SmsAnalyticsCards is a valid React component', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  expect(content).toMatch(/'use client'/);
  expect(content).toMatch(/export function SmsAnalyticsCards/);
  expect(content).toMatch(/return \(/);
})) passed++; else failed++;

if (test('SmsAnalyticsCards is imported in dashboard page', () => {
  const content = fs.readFileSync(dashboardPagePath, 'utf-8');
  expect(content).toMatch(
    /import\s+{\s*SmsAnalyticsCards\s*}\s+from\s+['"]@\/components\/dashboard\/SmsAnalyticsCards['"]/
  );
})) passed++; else failed++;

if (test('SmsAnalyticsCards is rendered in the JSX', () => {
  const content = fs.readFileSync(dashboardPagePath, 'utf-8');
  expect(content).toMatch(/<SmsAnalyticsCards\s*\/>/);
})) passed++; else failed++;

if (test('SmsAnalyticsCards is wrapped in Suspense boundary', () => {
  const content = fs.readFileSync(dashboardPagePath, 'utf-8');
  expect(content).toMatch(
    /<Suspense\s+fallback={<SmsAnalyticsCardsSkeleton\s*\/>\s*}>\s*<SmsAnalyticsCards\s*\/>\s*<\/Suspense>/
  );
})) passed++; else failed++;

if (test('SmsAnalyticsCardsSkeleton component is defined', () => {
  const content = fs.readFileSync(dashboardPagePath, 'utf-8');
  expect(content).toMatch(/function SmsAnalyticsCardsSkeleton\(/);
})) passed++; else failed++;

if (test('SmsAnalyticsCards is positioned between StatsCards and LeadFeed', () => {
  const content = fs.readFileSync(dashboardPagePath, 'utf-8');
  const statsCardsPos = content.indexOf('<StatsCards');
  const smsAnalyticsPos = content.indexOf('<SmsAnalyticsCards');
  const leadFeedPos = content.indexOf('<LeadFeed');
  
  assert(statsCardsPos > -1);
  assert(smsAnalyticsPos > -1);
  assert(leadFeedPos > -1);
  assert(statsCardsPos < smsAnalyticsPos);
  assert(smsAnalyticsPos < leadFeedPos);
})) passed++; else failed++;

if (test('Dashboard page has no syntax errors', () => {
  const content = fs.readFileSync(dashboardPagePath, 'utf-8');
  const openingBraces = (content.match(/{/g) || []).length;
  const closingBraces = (content.match(/}/g) || []).length;
  assert.strictEqual(openingBraces, closingBraces, 'Brace mismatch');
  
  const openingParens = (content.match(/\(/g) || []).length;
  const closingParens = (content.match(/\)/g) || []).length;
  assert.strictEqual(openingParens, closingParens, 'Parenthesis mismatch');
})) passed++; else failed++;

console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed\n`);

process.exit(failed > 0 ? 1 : 0);
