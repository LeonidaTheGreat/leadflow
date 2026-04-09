/**
 * E2E Test: Genome Phase 1A — Observability
 * Task ID: b68d4d53-a15f-4425-95b2-3f0f151285db
 *
 * Tests runtime behavior of the genome observability changes:
 * 1. heartbeat-wrapper.js — stdio: 'inherit' (not 'pipe')
 * 2. heartbeat-executor.js — _step() produces structured JSON logs
 * 3. heartbeat-executor.js — _reportStepFatalError() calls reportToTelegram
 * 4. /genome-health endpoint — MISSING (acceptance criteria gap)
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const GENOME_CORE = path.join(process.env.HOME, '.openclaw/genome/core')

function pass(msg) { console.log(`  ✅ PASS: ${msg}`) }
function fail(msg) { console.error(`  ❌ FAIL: ${msg}`); process.exitCode = 1 }
function warn(msg) { console.warn(`  ⚠️  WARN: ${msg}`) }

// ────────────────────────────────────────────────────────────
// Test 1: heartbeat-wrapper.js stdio: 'inherit'
// ────────────────────────────────────────────────────────────
console.log('\nTest 1: heartbeat-wrapper.js stdio: inherit')
{
  const wrapperPath = path.join(GENOME_CORE, 'heartbeat-wrapper.js')
  assert(fs.existsSync(wrapperPath), `File not found: ${wrapperPath}`)
  const content = fs.readFileSync(wrapperPath, 'utf8')

  // Verify stdio: 'inherit' is present
  if (content.includes("stdio: 'inherit'")) {
    pass("stdio: 'inherit' found in heartbeat-wrapper.js")
  } else {
    fail("stdio: 'inherit' NOT found — executor output may not be visible in logs")
  }

  // Verify stdio: 'pipe' is NOT used for executor launch
  const pipeMatches = content.match(/stdio:\s*['"]pipe['"]/g) || []
  if (pipeMatches.length === 0) {
    pass("stdio: 'pipe' not found — no silent subprocess output")
  } else {
    fail(`stdio: 'pipe' still present ${pipeMatches.length} time(s) — output may be suppressed`)
  }
}

// ────────────────────────────────────────────────────────────
// Test 2: heartbeat-executor.js structured JSON logging via _step()
// ────────────────────────────────────────────────────────────
console.log('\nTest 2: heartbeat-executor.js structured JSON step logging')
{
  const execPath = path.join(GENOME_CORE, 'heartbeat-executor.js')
  assert(fs.existsSync(execPath), `File not found: ${execPath}`)
  const content = fs.readFileSync(execPath, 'utf8')

  // _step() must exist as a method
  if (content.includes('async _step(') || content.includes('_step (')) {
    pass('_step() method exists in heartbeat-executor.js')
  } else {
    fail('_step() method NOT found')
  }

  // JSON.stringify with step and action fields
  if (content.includes('JSON.stringify') && content.includes('step:') && content.includes('action,')) {
    pass('Structured JSON logging (step, action) present in _step()')
  } else {
    fail('Structured JSON logging missing — step/action fields not found')
  }

  // Timestamp field
  if (content.includes('ts: new Date().toISOString()') || content.includes('timestamp:')) {
    pass('Timestamp included in structured log')
  } else {
    fail('No timestamp in structured JSON log')
  }

  // Duration tracking
  if (content.includes('duration_ms') || content.includes('durationMs')) {
    pass('Duration tracking present in step logs')
  } else {
    fail('No duration tracking in step logs')
  }

  // Outcome tracking
  if (content.includes("outcome,") || content.includes("outcome:")) {
    pass('Outcome field present in step logs')
  } else {
    fail('No outcome field in step logs')
  }
}

// ────────────────────────────────────────────────────────────
// Test 3: heartbeat-executor.js _recordStepOutcome exists
// ────────────────────────────────────────────────────────────
console.log('\nTest 3: heartbeat-executor.js _recordStepOutcome method')
{
  const execPath = path.join(GENOME_CORE, 'heartbeat-executor.js')
  const content = fs.readFileSync(execPath, 'utf8')

  if (content.includes('_recordStepOutcome(')) {
    pass('_recordStepOutcome() method exists')
  } else {
    fail('_recordStepOutcome() NOT found')
  }
}

// ────────────────────────────────────────────────────────────
// Test 4: Telegram alert on fatal step error
// ────────────────────────────────────────────────────────────
console.log('\nTest 4: heartbeat-executor.js Telegram alert on fatal error')
{
  const execPath = path.join(GENOME_CORE, 'heartbeat-executor.js')
  const content = fs.readFileSync(execPath, 'utf8')

  if (content.includes('_reportStepFatalError(')) {
    pass('_reportStepFatalError() method exists')
  } else {
    fail('_reportStepFatalError() NOT found')
  }

  if (content.includes('FATAL') && content.includes('reportToTelegram')) {
    pass('Fatal error reports to Telegram')
  } else {
    fail('Fatal errors do NOT report to Telegram')
  }
}

// ────────────────────────────────────────────────────────────
// Test 5: realtime-dispatcher.js Telegram alerts for Phase 1A conditions
// PRD requires: heartbeat failure >60min, agent crash, budget <$2, stale ready >2h
// ────────────────────────────────────────────────────────────
console.log('\nTest 5: realtime-dispatcher.js Phase 1A Telegram alerts')
{
  const dispPath = path.join(GENOME_CORE, 'realtime-dispatcher.js')
  assert(fs.existsSync(dispPath), `File not found: ${dispPath}`)
  const content = fs.readFileSync(dispPath, 'utf8')

  // Check for Telegram alert on heartbeat failure (>60 min)
  // PRD: "Telegram alerts for heartbeat failure"
  const hasHbTelegramAlert = content.includes('minsAgo > 60') &&
    (content.includes('sendTelegram') || content.includes('reportToTelegram'))
  if (hasHbTelegramAlert) {
    pass('Heartbeat >60min triggers Telegram alert in realtime-dispatcher.js')
  } else {
    fail('MISSING: No Telegram alert when heartbeat not run in >60min (only launchd restart)')
  }

  // Check for budget breach Telegram alert
  const hasBudgetTelegramAlert = (
    content.match(/budget.*[<$]2|remaining.*[<$]2/) &&
    (content.includes('sendTelegram') || content.includes('reportToTelegram'))
  )
  // More targeted: check if budget check near sendTelegram
  const budgetSection = content.match(/budget[\s\S]{0,200}sendTelegram/g)
  if (budgetSection) {
    pass('Budget breach triggers Telegram alert')
  } else {
    fail('MISSING: No Telegram alert for budget breach (<$2) in realtime-dispatcher.js healthCheck')
  }

  // Check for stale ready tasks >2h Telegram alert
  const hasStaleAlert = content.includes('stale') &&
    (content.includes('sendTelegram') || content.includes('reportToTelegram'))
  if (hasStaleAlert) {
    pass('Stale tasks detection with Telegram alert present')
  } else {
    fail('MISSING: No Telegram alert for stale ready tasks >2h in realtime-dispatcher.js')
  }
}

// ────────────────────────────────────────────────────────────
// Test 6: /genome-health REST endpoint
// PRD requires: endpoint in dashboard server returning health JSON
// ────────────────────────────────────────────────────────────
console.log('\nTest 6: /genome-health REST endpoint')
{
  const dashboardApiDir = path.join(
    __dirname, '../product/lead-response/dashboard/app/api'
  )
  const genomeHealthRoute = path.join(dashboardApiDir, 'genome-health/route.ts')
  const genomeHealthRouteJs = path.join(dashboardApiDir, 'genome-health/route.js')
  const serverJs = path.join(__dirname, '../server.js')

  const serverContent = fs.existsSync(serverJs) ? fs.readFileSync(serverJs, 'utf8') : ''
  const hasServerRoute = serverContent.includes('/genome-health')
  const hasNextRoute = fs.existsSync(genomeHealthRoute) || fs.existsSync(genomeHealthRouteJs)

  if (hasNextRoute) {
    pass('/genome-health Next.js API route exists')
  } else if (hasServerRoute) {
    pass('/genome-health endpoint exists in server.js')
  } else {
    fail('MISSING: /genome-health endpoint NOT found in dashboard (PRD acceptance criteria not met)')
  }
}

// ────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────────')
if (process.exitCode === 1) {
  console.error('\n❌ SOME TESTS FAILED — genome-phase1a-observability is INCOMPLETE')
} else {
  console.log('\n✅ All tests passed')
}
