/**
 * Test: Onboarding Completion + Aha Moment
 * Verifies the lead simulator is integrated as the final onboarding step
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard')

let passed = 0
let failed = 0
const failures = []

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
    failed++
    failures.push(label)
  }
}

function section(name) {
  console.log(`\n📋 ${name}`)
}

// ── 1. Onboarding Simulator API ─────────────────────────────────────────────

section('Onboarding Simulator API')

const simulatorRoute = path.join(DASHBOARD_DIR, 'app/api/onboarding/simulator/route.ts')
check('Simulator API route exists', fs.existsSync(simulatorRoute))

if (fs.existsSync(simulatorRoute)) {
  const simulatorCode = fs.readFileSync(simulatorRoute, 'utf8')
  check('Handles start action', simulatorCode.includes("action: 'start'"))
  check('Handles status action', simulatorCode.includes("action: 'status'"))
  check('Handles skip action', simulatorCode.includes("action: 'skip'"))
  check('Creates simulation record', simulatorCode.includes('onboarding_simulations'))
  check('Tracks response time', simulatorCode.includes('response_time_ms'))
}

// ── 2. Onboarding Simulator UI ──────────────────────────────────────────────

section('Onboarding Simulator UI')

const simulatorStep = path.join(DASHBOARD_DIR, 'app/onboarding/steps/simulator.tsx')
check('Simulator step component exists', fs.existsSync(simulatorStep))

if (fs.existsSync(simulatorStep)) {
  const stepCode = fs.readFileSync(simulatorStep, 'utf8')
  check('Has start simulation button', stepCode.includes('startSimulation'))
  check('Shows conversation display', stepCode.includes('conversation'))
  check('Tracks ahaCompleted', stepCode.includes('ahaCompleted'))
  check('Has skip option', stepCode.includes('skipSimulation'))
  check('Shows response time', stepCode.includes('response_time_ms'))
}

// ── 3. Setup Wizard Integration ─────────────────────────────────────────────

section('Setup Wizard Integration')

const setupPage = path.join(DASHBOARD_DIR, 'app/setup/page.tsx')
check('Setup page exists', fs.existsSync(setupPage))

if (fs.existsSync(setupPage)) {
  const setupCode = fs.readFileSync(setupPage, 'utf8')
  check('Includes simulator step', setupCode.includes('simulator'))
  check('Tracks simulatorCompleted', setupCode.includes('simulatorCompleted'))
}

const setupSimulator = path.join(DASHBOARD_DIR, 'app/setup/steps/simulator.tsx')
check('Setup simulator step exists', fs.existsSync(setupSimulator))

// ── 4. Dashboard Onboarding Page ────────────────────────────────────────────

section('Dashboard Onboarding Page')

const onboardingPage = path.join(DASHBOARD_DIR, 'app/dashboard/onboarding/page.tsx')
check('Dashboard onboarding page exists', fs.existsSync(onboardingPage))

if (fs.existsSync(onboardingPage)) {
  const pageCode = fs.readFileSync(onboardingPage, 'utf8')
  check('Imports simulator step', pageCode.includes('OnboardingSimulator'))
  check('Includes simulator in steps array', pageCode.includes("'simulator'"))
  check('Tracks ahaCompleted', pageCode.includes('ahaCompleted'))
  check('Tracks ahaResponseTimeMs', pageCode.includes('ahaResponseTimeMs'))
}

// ── 5. Database Migration ───────────────────────────────────────────────────

section('Database Migration')

const migrationFile = path.join(DASHBOARD_DIR, 'supabase/migrations/011_onboarding_simulator.sql')
check('Migration file exists', fs.existsSync(migrationFile))

if (fs.existsSync(migrationFile)) {
  const migration = fs.readFileSync(migrationFile, 'utf8')
  check('Creates onboarding_simulations table', migration.includes('CREATE TABLE IF NOT EXISTS onboarding_simulations'))
  check('Has session_id column', migration.includes('session_id'))
  check('Has agent_id column', migration.includes('agent_id'))
  check('Has status column', migration.includes('status'))
  check('Has conversation column', migration.includes('conversation'))
  check('Has response_time_ms column', migration.includes('response_time_ms'))
}

// ── 6. Summary ───────────────────────────────────────────────────────────────

section('Test Summary')
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.log('\n❌ Failed checks:')
  failures.forEach((f) => console.log(`  - ${f}`))
  process.exit(1)
} else {
  console.log('\n✅ All checks passed!')
  process.exit(0)
}
