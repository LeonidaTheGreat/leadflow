/**
 * E2E Test: fix-fix-not-implemented-23-api-routes-still-query-wron
 * Verifies all 13 API route files from the bug report no longer query
 * the wrong 'agents' table (orchestrator table) and instead use 'real_estate_agents'.
 *
 * AC-5: grep of product api dir shows 0 from('agents') product-customer references
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard');
const APP_DIR = path.join(DASHBOARD_DIR, 'app');

// Files explicitly listed in the bug PRD
const AFFECTED_FILES = [
  'app/api/webhook/route.ts',
  'app/api/webhook/fub/route.ts',
  'app/api/webhook/twilio/route.ts',
  'app/api/agents/check-email/route.ts',
  'app/api/agents/satisfaction-ping/route.ts',
  'app/api/agents/profile/route.ts',
  'app/api/satisfaction/stats/route.ts',
  'app/api/webhooks/stripe/route.ts',
  'app/api/onboarding/check-email/route.ts',
  'app/api/onboarding/submit/route.ts',
  'app/api/stripe/portal-session/route.ts',
  'app/api/debug/test-formdata/route.ts',
  'app/api/debug/test-full-flow/route.ts',
];

// Patterns that indicate querying the wrong table
const WRONG_TABLE_PATTERNS = [
  /\.from\(['"]agents['"]\)/,
  /agent:agents\(/,
];

let passed = 0;
let failed = 0;
const results = [];

console.log('=== E2E: fix-fix-not-implemented-23-api-routes-still-query-wron ===\n');
console.log('Verifying all 13 API route files use real_estate_agents (not agents)\n');

// Test 1: All 13 explicitly listed files have 0 wrong references
console.log('TEST 1: Check all 13 PRD-listed files for wrong table references');
for (const relPath of AFFECTED_FILES) {
  const absPath = path.join(DASHBOARD_DIR, relPath);
  if (!fs.existsSync(absPath)) {
    console.log(`  ⚠️  SKIP (file not found): ${relPath}`);
    continue;
  }
  const content = fs.readFileSync(absPath, 'utf8');
  const violations = [];
  for (const pattern of WRONG_TABLE_PATTERNS) {
    const matches = content.match(new RegExp(pattern.source, 'g'));
    if (matches) violations.push(...matches);
  }
  if (violations.length === 0) {
    console.log(`  ✅ PASS: ${relPath}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${relPath} — found ${violations.length} wrong reference(s): ${violations.join(', ')}`);
    failed++;
  }
  results.push({ file: relPath, violations });
}

// Test 2: Broad scan of all API routes (not just the listed ones)
console.log('\nTEST 2: Broad scan — all app/api/**/*.ts files');
function walk(dir, ext, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      walk(full, ext, files);
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      files.push(full);
    }
  }
  return files;
}

const apiDir = path.join(DASHBOARD_DIR, 'app/api');
const allApiFiles = walk(apiDir, '.ts');
let broadViolations = [];

for (const absPath of allApiFiles) {
  const content = fs.readFileSync(absPath, 'utf8');
  for (const pattern of WRONG_TABLE_PATTERNS) {
    const matches = content.match(new RegExp(pattern.source, 'g'));
    if (matches) {
      const rel = path.relative(DASHBOARD_DIR, absPath);
      broadViolations.push({ file: rel, matches });
    }
  }
}

if (broadViolations.length === 0) {
  console.log('  ✅ PASS: 0 wrong-table references across all API routes');
  passed++;
} else {
  console.log(`  ❌ FAIL: ${broadViolations.length} file(s) still have wrong references:`);
  for (const v of broadViolations) {
    console.log(`    - ${v.file}: ${v.matches.join(', ')}`);
  }
  failed++;
}

// Test 3: Spot-check the specific fix in test-formdata (getDefaultAgent)
console.log('\nTEST 3: Spot-check debug/test-formdata/route.ts — getDefaultAgent uses real_estate_agents');
{
  const f = path.join(DASHBOARD_DIR, 'app/api/debug/test-formdata/route.ts');
  const content = fs.readFileSync(f, 'utf8');
  const hasCorrect = content.includes("from('real_estate_agents')") || content.includes('from("real_estate_agents")');
  const hasWrong = /\.from\(['"]agents['"]\)/.test(content);
  if (hasCorrect && !hasWrong) {
    console.log('  ✅ PASS: uses real_estate_agents, no agents reference');
    passed++;
  } else {
    console.log(`  ❌ FAIL: hasCorrect=${hasCorrect}, hasWrong=${hasWrong}`);
    failed++;
  }
}

// Test 4: Spot-check webhook/fub — leads join uses real_estate_agents
console.log('\nTEST 4: Spot-check webhook/fub/route.ts — leads join uses agent:real_estate_agents(*)');
{
  const f = path.join(DASHBOARD_DIR, 'app/api/webhook/fub/route.ts');
  const content = fs.readFileSync(f, 'utf8');
  const hasCorrectJoin = content.includes('agent:real_estate_agents(*)');
  const hasWrongJoin = content.includes('agent:agents(*)');
  if (hasCorrectJoin && !hasWrongJoin) {
    console.log('  ✅ PASS: join uses agent:real_estate_agents(*), no agent:agents(*) reference');
    passed++;
  } else {
    console.log(`  ❌ FAIL: hasCorrectJoin=${hasCorrectJoin}, hasWrongJoin=${hasWrongJoin}`);
    failed++;
  }
}

// Test 5: Spot-check webhook/twilio — leads join uses real_estate_agents
console.log('\nTEST 5: Spot-check webhook/twilio/route.ts — leads join uses agent:real_estate_agents(*)');
{
  const f = path.join(DASHBOARD_DIR, 'app/api/webhook/twilio/route.ts');
  const content = fs.readFileSync(f, 'utf8');
  const hasCorrectJoin = content.includes('agent:real_estate_agents(*)');
  const hasWrongJoin = content.includes('agent:agents(*)');
  if (hasCorrectJoin && !hasWrongJoin) {
    console.log('  ✅ PASS: join uses agent:real_estate_agents(*), no agent:agents(*) reference');
    passed++;
  } else {
    console.log(`  ❌ FAIL: hasCorrectJoin=${hasCorrectJoin}, hasWrongJoin=${hasWrongJoin}`);
    failed++;
  }
}

// Summary
const total = passed + failed;
const passRate = total > 0 ? (passed / total) : 0;

console.log('\n============================================================');
console.log('SUMMARY');
console.log('============================================================');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Pass Rate: ${(passRate * 100).toFixed(0)}%`);

if (failed > 0) {
  process.exit(1);
}
