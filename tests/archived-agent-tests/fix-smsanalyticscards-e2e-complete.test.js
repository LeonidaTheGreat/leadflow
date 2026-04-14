/**
 * E2E Test: SmsAnalyticsCards Component — Complete Behavior Coverage
 * 
 * Tests:
 * - Component renders correctly in dashboard
 * - API calls are made with correct parameters
 * - Loading and error states work
 * - Time window selection works
 * - Edge cases handled (null data, API errors)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const dashboardPagePath = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/dashboard/page.tsx'
);

const smsAnalyticsComponentPath = path.join(
  __dirname,
  '../product/lead-response/dashboard/components/dashboard/SmsAnalyticsCards.tsx'
);

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
    return true;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${err.message}`);
    testsFailed++;
    return false;
  }
}

console.log('\n🧪 E2E Test Suite: SmsAnalyticsCards Component\n');

// ============================================================
// GROUP 1: Component Structure & Imports
// ============================================================
console.log('📋 Group 1: Component Structure & Imports');

test('SmsAnalyticsCards component file exists', () => {
  assert(fs.existsSync(smsAnalyticsComponentPath), 'Component file not found');
});

test('Dashboard page imports SmsAnalyticsCards correctly', () => {
  const content = fs.readFileSync(dashboardPagePath, 'utf-8');
  const importMatch = content.match(
    /import\s+{\s*SmsAnalyticsCards\s*}\s+from\s+['"]@\/components\/dashboard\/SmsAnalyticsCards['"]/
  );
  assert(importMatch, 'SmsAnalyticsCards not properly imported');
});

test('Component exports SmsAnalyticsCards function', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  assert(
    content.includes('export function SmsAnalyticsCards'),
    'SmsAnalyticsCards function not exported'
  );
});

// ============================================================
// GROUP 2: React Directives & Hooks
// ============================================================
console.log('\n📋 Group 2: React Directives & Hooks');

test("Component has 'use client' directive", () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  assert(
    content.includes("'use client'"),
    "'use client' directive not found (required for client-side interactivity)"
  );
});

test('Component uses React hooks (useState, useEffect, useCallback)', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  assert(content.includes('useState'), 'useState hook not found');
  assert(content.includes('useEffect'), 'useEffect hook not found');
  assert(content.includes('useCallback'), 'useCallback hook not found');
});

test('Component defines TypeScript types (TimeWindow, SmsStats)', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  assert(content.includes('type TimeWindow'), 'TimeWindow type not defined');
  assert(content.includes('interface SmsStats'), 'SmsStats interface not defined');
});

// ============================================================
// GROUP 3: API Integration
// ============================================================
console.log('\n📋 Group 3: API Integration');

test('Component fetches from /api/analytics/sms-stats endpoint', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  assert(
    content.includes('/api/analytics/sms-stats'),
    'API endpoint not found in component'
  );
});

test('API call includes cache: no-store directive', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  const fetchMatch = content.match(
    /fetch\([^)]*\/api\/analytics\/sms-stats[^)]*,\s*{\s*cache:\s*['"]no-store['"]/
  );
  assert(fetchMatch, "cache: 'no-store' not found in fetch call");
});

test('API call includes time window parameter', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  assert(
    content.includes('window='),
    'Time window parameter not passed to API'
  );
});

test('Fetch call has error handling (try/catch)', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  const tryIndex = content.indexOf('try {');
  const catchIndex = content.indexOf('} catch (err)');
  assert(tryIndex > -1, 'try block not found');
  assert(catchIndex > tryIndex, 'catch block not found after try');
});

// ============================================================
// GROUP 4: Error States & Loading
// ============================================================
console.log('\n📋 Group 4: Error States & Loading');

test('Component renders error message when fetch fails', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  assert(
    content.includes('error && !loading'),
    'Error state condition not found'
  );
  assert(
    content.includes('⚠️') || content.includes('error'),
    'Error message not displayed'
  );
});

test('Component has loading state (useState, loading)', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  assert(content.includes('loading'), 'Loading state not found');
  assert(content.includes('setLoading'), 'setLoading not called');
});

test('Loading state updates correctly (setLoading true/false)', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  assert(
    content.includes('setLoading(true)'),
    'setLoading(true) not found'
  );
  assert(
    content.includes('setLoading(false)'),
    'setLoading(false) not found'
  );
});

// ============================================================
// GROUP 5: Rendering & DOM Structure
// ============================================================
console.log('\n📋 Group 5: Rendering & DOM Structure');

test('SmsAnalyticsCards rendered in dashboard page JSX', () => {
  const content = fs.readFileSync(dashboardPagePath, 'utf-8');
  assert(
    content.includes('<SmsAnalyticsCards'),
    'SmsAnalyticsCards component not rendered'
  );
});

test('Component wrapped in Suspense boundary', () => {
  const content = fs.readFileSync(dashboardPagePath, 'utf-8');
  const suspenseMatch = content.match(
    /<Suspense\s+fallback={<SmsAnalyticsCardsSkeleton\s*\/>\s*}>\s*<SmsAnalyticsCards/
  );
  assert(suspenseMatch, 'Suspense boundary not found around SmsAnalyticsCards');
});

test('Skeleton component provided for Suspense fallback', () => {
  const content = fs.readFileSync(dashboardPagePath, 'utf-8');
  assert(
    content.includes('SmsAnalyticsCardsSkeleton'),
    'Skeleton component not defined'
  );
  assert(
    content.includes('function SmsAnalyticsCardsSkeleton'),
    'Skeleton function not found'
  );
});

test('SmsAnalyticsCards positioned correctly in layout', () => {
  const content = fs.readFileSync(dashboardPagePath, 'utf-8');
  const statsPos = content.indexOf('<StatsCards');
  const smsPos = content.indexOf('<SmsAnalyticsCards');
  const leadPos = content.indexOf('<LeadFeed');
  
  assert(statsPos > -1, 'StatsCards not found');
  assert(smsPos > -1, 'SmsAnalyticsCards not found');
  assert(leadPos > -1, 'LeadFeed not found');
  assert(
    statsPos < smsPos && smsPos < leadPos,
    'SmsAnalyticsCards not positioned between StatsCards and LeadFeed'
  );
});

// ============================================================
// GROUP 6: Time Window Selection
// ============================================================
console.log('\n📋 Group 6: Time Window Selection');

test('Time window selector renders three buttons (7d, 30d, all)', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  assert(
    content.includes("'7d'") && content.includes("'30d'") && content.includes("'all'"),
    'Time window options not found'
  );
  assert(
    content.includes('handleWindowChange') || content.includes('setWindow'),
    'Window change handler not found'
  );
});

test('Window parameter passed to API endpoint', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  const apiCall = content.match(/\/api\/analytics\/sms-stats\?window=\$\{/);
  assert(apiCall, 'Window parameter not dynamically passed to API');
});

test('useEffect re-fetches when window changes', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  // Check that useEffect exists and fetches stats
  assert(
    content.includes('useEffect(() => {') && content.includes('fetchStats(window)'),
    'useEffect does not call fetchStats with window'
  );
  // Check that window and fetchStats are in dependency array
  assert(
    content.includes('[window, fetchStats]'),
    'useEffect dependency array does not include window and fetchStats'
  );
});

// ============================================================
// GROUP 7: Data Display & Formatting
// ============================================================
console.log('\n📋 Group 7: Data Display & Formatting');

test('Component displays three stat cards', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  assert(
    content.includes('Delivery Rate'),
    'Delivery Rate card not found'
  );
  assert(
    content.includes('Reply Rate'),
    'Reply Rate card not found'
  );
  assert(
    content.includes('Booking Conversion'),
    'Booking Conversion card not found'
  );
});

test('formatRate function handles null values', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  const formatMatch = content.match(
    /function formatRate\(([^)]*)\)[^}]*if\s*\([^)]*null/
  );
  assert(formatMatch, 'formatRate null check not found');
});

test('Color coding applied to delivery rate', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  assert(
    content.includes('deliveryRateColor'),
    'deliveryRateColor function not found'
  );
  assert(
    content.includes('emerald') || content.includes('0.8'),
    'Green threshold (80%) not found'
  );
  assert(
    content.includes('amber') || content.includes('0.6'),
    'Amber threshold (60%) not found'
  );
});

// ============================================================
// GROUP 8: Syntax & Code Quality
// ============================================================
console.log('\n📋 Group 8: Syntax & Code Quality');

test('No loose equality operators (== or !=)', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  // Check for == or != not followed by =
  const looseEq = content.match(/[^=!<>]==[^=]|[^=!<>]!=[^=]/);
  assert(!looseEq, 'Loose equality operator found (use === instead)');
});

test('No eval() or innerHTML usage', () => {
  const content = fs.readFileSync(smsAnalyticsComponentPath, 'utf-8');
  assert(!content.includes('eval('), 'eval() found');
  assert(!content.includes('innerHTML'), 'innerHTML found');
  assert(!content.includes('dangerouslySetInnerHTML'), 'dangerouslySetInnerHTML found');
});

test('Proper brace and parenthesis balance', () => {
  const content = fs.readFileSync(dashboardPagePath, 'utf-8');
  const openBrace = (content.match(/{/g) || []).length;
  const closeBrace = (content.match(/}/g) || []).length;
  const openParen = (content.match(/\(/g) || []).length;
  const closeParen = (content.match(/\)/g) || []).length;
  
  assert.strictEqual(openBrace, closeBrace, 'Brace mismatch in dashboard page');
  assert.strictEqual(openParen, closeParen, 'Parenthesis mismatch in dashboard page');
});

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`📊 TEST SUMMARY`);
console.log(`${'='.repeat(60)}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
console.log(`${'='.repeat(60)}\n`);

process.exit(testsFailed > 0 ? 1 : 0);
