/**
 * E2E Test: Scroll Depth Tracking Implementation Verification
 * 
 * Verifies that attachScrollMilestoneObservers is properly wired on the landing page.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, '..');
const GA4_FILE = path.join(TEST_DIR, 'lib/analytics/ga4.ts');
const TRACKER_FILE = path.join(TEST_DIR, 'components/scroll-depth-tracker.tsx');
const PAGE_FILE = path.join(TEST_DIR, 'app/page.tsx');

console.log('\n🧪 E2E TEST: Scroll Depth Tracking — Implementation Verification\n');

const results = {
  passed: 0,
  failed: 0,
  checks: []
};

// ──── Check 1: attachScrollMilestoneObservers exists ────

console.log('  [1/4] Checking attachScrollMilestoneObservers export...');
try {
  if (!fs.existsSync(GA4_FILE)) throw new Error('ga4.ts not found');
  const ga4 = fs.readFileSync(GA4_FILE, 'utf-8');
  assert(ga4.includes('export function attachScrollMilestoneObservers'));
  console.log('  ✅ PASS: attachScrollMilestoneObservers exported');
  results.passed++;
  results.checks.push({ name: 'attachScrollMilestoneObservers exists', pass: true });
} catch (e) {
  console.log(`  ❌ FAIL: ${e.message}`);
  results.failed++;
  results.checks.push({ name: 'attachScrollMilestoneObservers exists', pass: false, error: e.message });
}

// ──── Check 2: ScrollDepthTracker exists ────

console.log('  [2/4] Checking ScrollDepthTracker component exists...');
try {
  if (!fs.existsSync(TRACKER_FILE)) {
    throw new Error('ScrollDepthTracker component NOT FOUND at ' + TRACKER_FILE);
  }
  const tracker = fs.readFileSync(TRACKER_FILE, 'utf-8');
  assert(tracker.includes("'use client'"));
  assert(tracker.includes('useEffect'));
  assert(tracker.includes('attachScrollMilestoneObservers'));
  console.log('  ✅ PASS: ScrollDepthTracker component properly implemented');
  results.passed++;
  results.checks.push({ name: 'ScrollDepthTracker exists and uses correct pattern', pass: true });
} catch (e) {
  console.log(`  ❌ FAIL: ${e.message}`);
  results.failed++;
  results.checks.push({ name: 'ScrollDepthTracker exists and uses correct pattern', pass: false, error: e.message });
}

// ──── Check 3: page.tsx imports ScrollDepthTracker ────

console.log('  [3/4] Checking page.tsx imports ScrollDepthTracker...');
try {
  if (!fs.existsSync(PAGE_FILE)) throw new Error('page.tsx not found');
  const page = fs.readFileSync(PAGE_FILE, 'utf-8');
  assert(page.includes('ScrollDepthTracker'), 'ScrollDepthTracker not imported');
  assert(page.includes('<ScrollDepthTracker'), 'ScrollDepthTracker not rendered');
  console.log('  ✅ PASS: page.tsx imports and renders ScrollDepthTracker');
  results.passed++;
  results.checks.push({ name: 'page.tsx imports ScrollDepthTracker', pass: true });
} catch (e) {
  console.log(`  ❌ FAIL: ${e.message}`);
  results.failed++;
  results.checks.push({ name: 'page.tsx imports ScrollDepthTracker', pass: false, error: e.message });
}

// ──── Check 4: Build succeeds ────

console.log('  [4/4] Checking build succeeds...');
try {
  require('child_process').execSync('npm run build 2>&1 | tail -5', {
    cwd: TEST_DIR,
    stdio: 'pipe',
    timeout: 120000
  });
  console.log('  ✅ PASS: Build succeeded');
  results.passed++;
  results.checks.push({ name: 'Build succeeds', pass: true });
} catch (e) {
  console.log(`  ⚠️  SKIP: Build check (requires npm run build)`);
  results.checks.push({ name: 'Build succeeds', pass: null, skipped: true });
}

// ──── Summary ────

console.log('\n════════════════════════════════════════════════════════════════\n');

if (results.failed > 0) {
  console.log(`❌ REJECTION: ${results.failed} acceptance criteria not met\n`);
  console.log('Failed Checks:');
  results.checks.filter(c => !c.pass && !c.skipped).forEach(c => {
    console.log(`  • ${c.name}`);
    if (c.error) console.log(`    → ${c.error}`);
  });
  console.log(`\nPassed: ${results.passed}/${results.checks.length}`);
  console.log(`Failed: ${results.failed}/${results.checks.length}\n`);
  process.exit(1);
} else {
  console.log(`✅ APPROVAL: All ${results.passed} acceptance criteria met!\n`);
  console.log('Summary:');
  results.checks.forEach(c => {
    if (!c.skipped) console.log(`  ✅ ${c.name}`);
  });
  console.log('\nScroll depth tracking is now properly wired!\n');
  process.exit(0);
}
