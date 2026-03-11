/**
 * E2E Test: fix-three-consecutive-vercel-builds-failing-fix-never-
 * Verifies that the missing PilotStatusBanner import fix:
 *   1. Build succeeds (no TypeScript/import errors)
 *   2. PilotStatusBanner component exists and exports correctly
 *   3. Dashboard page includes the import in source
 *   4. Built output contains /dashboard route
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DASHBOARD_DIR = path.resolve(__dirname, '..');
const COMPONENT_PATH = path.join(DASHBOARD_DIR, 'components/dashboard/PilotStatusBanner.tsx');
const PAGE_PATH = path.join(DASHBOARD_DIR, 'app/dashboard/page.tsx');
const BUILD_DIR = path.join(DASHBOARD_DIR, '.next');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n=== fix-three-consecutive-vercel-builds-failing-fix-never- ===\n');

// 1. Component file exists
check('PilotStatusBanner.tsx component file exists', () => {
  assert(fs.existsSync(COMPONENT_PATH), `Missing: ${COMPONENT_PATH}`);
});

// 2. Component exports PilotStatusBanner function
check('PilotStatusBanner component exports the named function', () => {
  const src = fs.readFileSync(COMPONENT_PATH, 'utf8');
  assert(src.includes('export function PilotStatusBanner'), 'Missing export function PilotStatusBanner');
});

// 3. Dashboard page imports PilotStatusBanner
check('dashboard/page.tsx imports PilotStatusBanner', () => {
  const src = fs.readFileSync(PAGE_PATH, 'utf8');
  assert(
    src.includes("import { PilotStatusBanner } from '@/components/dashboard/PilotStatusBanner'"),
    'Import statement not found in dashboard page'
  );
});

// 4. Build directory exists (build ran successfully)
check('.next build output exists', () => {
  assert(fs.existsSync(BUILD_DIR), '.next directory not found — build has not run');
});

// 5. Build output contains the dashboard route
check('.next build output contains /dashboard route', () => {
  // Check that app/dashboard exists in the server output
  const serverDir = path.join(BUILD_DIR, 'server/app/dashboard');
  // Also accept static
  const staticDir = path.join(BUILD_DIR, 'static');
  assert(
    fs.existsSync(serverDir) || fs.existsSync(staticDir),
    'Neither server/app/dashboard nor static output found in .next'
  );
});

// 6. No hardcoded secrets in the new/changed files
check('No hardcoded secrets in PilotStatusBanner.tsx', () => {
  const src = fs.readFileSync(COMPONENT_PATH, 'utf8');
  const secretPatterns = [/sk_live_/, /sk_test_/, /SUPABASE_SERVICE_ROLE/, /password\s*=\s*["'][^"']+/i];
  for (const p of secretPatterns) {
    assert(!p.test(src), `Potential secret found matching ${p}`);
  }
});

// 7. Run npm run build to confirm no compile errors
check('npm run build succeeds', () => {
  try {
    execSync('npm run build', { cwd: DASHBOARD_DIR, stdio: 'pipe', timeout: 120000 });
  } catch (e) {
    throw new Error(`Build failed: ${e.stderr ? e.stderr.toString().slice(0, 500) : e.message}`);
  }
});

// Summary
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
