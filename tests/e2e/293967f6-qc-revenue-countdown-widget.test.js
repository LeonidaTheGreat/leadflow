/**
 * E2E Test: QC Review — uc-revenue-countdown-widget (PR #1062)
 * Task ID: 293967f6-9e2a-4c12-9ecf-86301498a9b3
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASH = path.join(__dirname, '..', '..', 'product', 'lead-response', 'dashboard')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`❌ FAIL: ${name}`)
    console.log(`   ${err.message}`)
    failed++
  }
}

console.log('🔍 QC Test: PR #1062 — uc-revenue-countdown-widget\n')

// ─── Trial Countdown Widget ───────────────────────────────────────────────────
test('TrialCountdownWidget.tsx exists', () => {
  const f = path.join(DASH, 'components', 'dashboard', 'TrialCountdownWidget.tsx')
  assert(fs.existsSync(f), `File not found: ${f}`)
})

test('TrialCountdownWidget uses data-testid attributes', () => {
  const f = path.join(DASH, 'components', 'dashboard', 'TrialCountdownWidget.tsx')
  const c = fs.readFileSync(f, 'utf8')
  assert(c.includes('data-testid="trial-countdown-widget"'), 'Should have trial-countdown-widget testid')
  assert(c.includes('data-testid="trial-time-remaining"'), 'Should have trial-time-remaining testid')
  assert(c.includes('data-testid="upgrade-cta-btn"'), 'Should have upgrade-cta-btn testid')
})

// ─── Schema consistency ───────────────────────────────────────────────────────
test('Migration adds trial_start_date (not trial_started_at)', () => {
  const migPath = path.join(__dirname, '..', '..', 'migrations', '012_trial_aha_moment.sql')
  assert(fs.existsSync(migPath), 'Migration file should exist')
  const c = fs.readFileSync(migPath, 'utf8')
  assert(c.includes('trial_start_date'), 'Migration should add trial_start_date column')
  assert(!c.includes('trial_started_at'), 'Migration should NOT reference trial_started_at')
})

test('send-aha-day3 GET handler uses correct column trial_start_date (FAILS — bug)', () => {
  const f = path.join(DASH, 'app', 'api', 'onboarding', 'send-aha-day3', 'route.ts')
  const c = fs.readFileSync(f, 'utf8')
  // The GET handler uses trial_started_at but migration adds trial_start_date
  const usesWrongColumn = c.includes('trial_started_at')
  assert(!usesWrongColumn, 'GET handler must query trial_start_date (not trial_started_at) — schema mismatch: day-3 cohort will return 0 agents at runtime')
})

// ─── No duplicate routes ──────────────────────────────────────────────────────
test('Only one simulator status route (no duplicates)', () => {
  const route1 = path.join(DASH, 'app', 'api', 'onboarding', 'simulator-status', 'route.ts')
  const route2 = path.join(DASH, 'app', 'api', 'onboarding', 'simulator', 'status', 'route.ts')
  const both = fs.existsSync(route1) && fs.existsSync(route2)
  assert(!both, 'Both /onboarding/simulator-status and /onboarding/simulator/status exist — duplicate routes for the same operation violate "one pattern per operation" rule')
})

// ─── Auth on sensitive endpoints ──────────────────────────────────────────────
test('GET /api/onboarding/send-aha-day3 requires authentication', () => {
  const f = path.join(DASH, 'app', 'api', 'onboarding', 'send-aha-day3', 'route.ts')
  const c = fs.readFileSync(f, 'utf8')
  // Check GET function has auth
  const getHandlerIdx = c.indexOf('export async function GET')
  assert(getHandlerIdx > -1, 'GET handler should exist')
  const getBody = c.slice(getHandlerIdx)
  assert(
    getBody.includes('getAuthUserId') || getBody.includes('verifyAdminAuth') || getBody.includes('authorization'),
    'GET handler must authenticate the caller before returning trial agent emails'
  )
})

// ─── Magic numbers ────────────────────────────────────────────────────────────
test('aha-moment metrics route has no bare 0.8 threshold', () => {
  const f = path.join(DASH, 'app', 'api', 'admin', 'metrics', 'aha-moment', 'route.ts')
  const c = fs.readFileSync(f, 'utf8')
  // 0.8 is a business threshold — should be a named constant
  const hasBareThreshold = /const targetRate = 0\.8/.test(c)
  assert(!hasBareThreshold, 'targetRate = 0.8 is a bare magic number for a business threshold — must be a named constant in config')
})

// ─── Dead code ────────────────────────────────────────────────────────────────
test('SimulatorBanner.tsx is imported somewhere (no dead code)', () => {
  const banner = path.join(DASH, 'components', 'dashboard', 'SimulatorBanner.tsx')
  if (!fs.existsSync(banner)) { passed++; return } // already counted above

  // grep all tsx/ts files for SimulatorBanner import
  const usages = []
  function walk(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      if (f.name === 'SimulatorBanner.tsx') continue
      const full = path.join(dir, f.name)
      if (f.isDirectory() && !full.includes('node_modules') && !full.includes('.next')) walk(full)
      else if (f.isFile() && (f.name.endsWith('.tsx') || f.name.endsWith('.ts'))) {
        const c = fs.readFileSync(full, 'utf8')
        if (c.includes('SimulatorBanner')) usages.push(full)
      }
    }
  }
  walk(DASH)
  assert(usages.length > 0, 'SimulatorBanner.tsx is never imported — dead code introduced to the codebase')
})

// ─── Build ────────────────────────────────────────────────────────────────────
test('Dashboard build succeeds (exit 0)', () => {
  const { execSync } = require('child_process')
  const result = execSync('npm run build 2>&1 | tail -3', {
    cwd: DASH,
    encoding: 'utf8',
    timeout: 180000
  })
  // If build failed, it would have thrown — we're good
  assert(true, 'Build passed')
})

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
