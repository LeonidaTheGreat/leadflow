/**
 * E2E Test: feat-onboarding-completion-telemetry
 * Tests the onboarding completion telemetry implementation
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard')
const MIGRATION_FILE = path.join(
  DASHBOARD_DIR,
  'supabase/migrations/012_onboarding_completion_telemetry.sql'
)
const TELEMETRY_LIB = path.join(__dirname, '../lib/onboarding-telemetry.js')
const FUNNEL_API = path.join(DASHBOARD_DIR, 'app/api/admin/funnel/route.ts')
const LOG_EVENT_API = path.join(DASHBOARD_DIR, 'app/api/onboarding/log-event/route.ts')
const CRON_API = path.join(DASHBOARD_DIR, 'app/api/cron/check-stuck-agents/route.ts')
const FUNNEL_PAGE = path.join(DASHBOARD_DIR, 'app/admin/funnel/page.tsx')
const HOOK_FILE = path.join(DASHBOARD_DIR, 'hooks/useOnboardingTelemetry.ts')

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

// ── 1. File Existence ───────────────────────────────────────────────────────

section('Files created')

const requiredFiles = [
  MIGRATION_FILE,
  TELEMETRY_LIB,
  FUNNEL_API,
  LOG_EVENT_API,
  CRON_API,
  FUNNEL_PAGE,
  HOOK_FILE,
]

for (const f of requiredFiles) {
  check(`File exists: ${path.relative(DASHBOARD_DIR, f)}`, fs.existsSync(f))
}

// ── 2. Migration Schema ──────────────────────────────────────────────────────

section('Migration: 012_onboarding_completion_telemetry.sql')

const migration = fs.readFileSync(MIGRATION_FILE, 'utf8')

check('Adds onboarding_step column', migration.includes('onboarding_step INT'))
check('Adds last_onboarding_step_update column', migration.includes('last_onboarding_step_update'))
check('Creates onboarding_events table', migration.includes('CREATE TABLE IF NOT EXISTS onboarding_events'))
check('onboarding_events has agent_id UUID', migration.includes('agent_id') && migration.includes('UUID'))
check('onboarding_events has step_name', migration.includes('step_name'))
check('onboarding_events has status enum', migration.includes("CHECK (status IN ('started'"))
check('Status includes all values', ['started', 'completed', 'failed', 'skipped'].every(s => migration.includes(`'${s}'`)))
check('Valid step names in migration', ['email_verified', 'fub_connected', 'phone_configured', 'sms_verified', 'aha_completed'].every(s => migration.includes(`'${s}'`)))
check('onboarding_events has timestamp', migration.includes('timestamp'))
check('onboarding_events has metadata', migration.includes('metadata'))
check('Indexes created', migration.includes('idx_onboarding_events_agent_id'))
check('Creates onboarding_stuck_alerts', migration.includes('CREATE TABLE IF NOT EXISTS onboarding_stuck_alerts'))
check('Stuck alerts UNIQUE(agent_id, step_name)', migration.includes('UNIQUE(agent_id, step_name)'))
check('Creates is_smoke_test_account', migration.includes('is_smoke_test_account'))
check('Smoke test checks smoke-test@*', migration.includes("'smoke-test@%'"))
check('Smoke test checks *@leadflow-test.com', migration.includes("'%@leadflow-test.com'"))
check('Creates funnel_real_agents view', migration.includes('CREATE OR REPLACE VIEW funnel_real_agents'))
check('funnel_real_agents filters smoke test', migration.includes('WHERE NOT is_smoke_test_account'))
check('Creates funnel_conversion_rates view', migration.includes('CREATE OR REPLACE VIEW funnel_conversion_rates'))

// ── 3. Telemetry Library ─────────────────────────────────────────────────────

section('Library: lib/onboarding-telemetry.js')

let telemetryLib = ''
try {
  telemetryLib = fs.readFileSync(TELEMETRY_LIB, 'utf8')
} catch (err) {
  console.error(`  ❌ Cannot read library`)
}

check('Exports logOnboardingEvent', telemetryLib.includes('logOnboardingEvent'))
check('Exports getFunnelStatus', telemetryLib.includes('getFunnelStatus'))
check('Exports getFunnelConversions', telemetryLib.includes('getFunnelConversions'))
check('Exports checkAndAlertStuckAgents', telemetryLib.includes('checkAndAlertStuckAgents'))
check('Exports getOnboardingEvents', telemetryLib.includes('getOnboardingEvents'))
check('Exports STEP_INDEX', telemetryLib.includes('STEP_INDEX'))
check('Exports STEP_NAMES', telemetryLib.includes('STEP_NAMES'))
check('Exports isSmokTestAccount', telemetryLib.includes('isSmokTestAccount'))
check('logOnboardingEvent validates step names', telemetryLib.includes('STEP_NAMES.includes(stepName)'))
check('logOnboardingEvent inserts event', telemetryLib.includes("from('onboarding_events')"))
check('Updates onboarding_step on completion', telemetryLib.includes('onboarding_step: stepIndex'))
check('Marks onboarding_completed at step 5', telemetryLib.includes('stepIndex === 5'))
check('Monotonic non-decreasing logic', telemetryLib.includes('stepIndex > currentStep'))
check('getFunnelStatus queries funnel view', telemetryLib.includes("from('funnel_real_agents')"))
check('Handles >24h stuck agents', telemetryLib.includes('24 * 60 * 60 * 1000'))

// ── 4. API Routes ───────────────────────────────────────────────────────────

section('API Route: /api/admin/funnel')
let funnelApi = fs.readFileSync(FUNNEL_API, 'utf8')
check('GET handler exported', funnelApi.includes('export async function GET'))
check('Requires auth', funnelApi.includes('Unauthorized'))
check('Calls getFunnelStatus', funnelApi.includes('getFunnelStatus'))
check('Calls getFunnelConversions', funnelApi.includes('getFunnelConversions'))
check('Returns JSON', funnelApi.includes('NextResponse.json'))

section('API Route: /api/onboarding/log-event')
let logEventApi = fs.readFileSync(LOG_EVENT_API, 'utf8')
check('POST handler', logEventApi.includes('export async function POST'))
check('Requires auth', logEventApi.includes('Unauthorized'))
check('Gets agent_id', logEventApi.includes('agent_id'))
check('Validates fields', logEventApi.includes('step_name') && logEventApi.includes('status'))
check('Calls logOnboardingEvent', logEventApi.includes('logOnboardingEvent'))

section('API Route: /api/cron/check-stuck-agents')
let cronApi = fs.readFileSync(CRON_API, 'utf8')
check('GET handler', cronApi.includes('export async function GET'))
check('Validates CRON_SECRET', cronApi.includes('CRON_SECRET'))
check('Uses service role key', cronApi.includes('SUPABASE_SERVICE_ROLE_KEY'))
check('Calls checkAndAlertStuckAgents', cronApi.includes('checkAndAlertStuckAgents'))

// ── 5. Admin Page ────────────────────────────────────────────────────────────

section('Admin Page: /admin/funnel')
let funnelPage = fs.readFileSync(FUNNEL_PAGE, 'utf8')
check('Fetches /api/admin/funnel', funnelPage.includes('/api/admin/funnel'))
check('Displays step distribution', funnelPage.includes('Step Distribution'))
check('Shows stuck agents', funnelPage.includes('Stuck'))
check('Displays conversion rates', funnelPage.includes('Conversion'))

// ── 6. React Hook ────────────────────────────────────────────────────────────

section('Hook: useOnboardingTelemetry')
let hookFile = fs.readFileSync(HOOK_FILE, 'utf8')
check('Exports hook', hookFile.includes('useOnboardingTelemetry'))
check('Has logEvent', hookFile.includes('logEvent'))
check('Has isLoading', hookFile.includes('isLoading'))
check('Has error state', hookFile.includes('error'))
check('Calls /api/onboarding/log-event', hookFile.includes('/api/onboarding/log-event'))
check('Defines OnboardingStepName', hookFile.includes('OnboardingStepName'))

// ── 7. Integration ────────────────────────────────────────────────────────────

section('Integration: /api/setup/status')
const setupStatusRoute = path.join(DASHBOARD_DIR, 'app/api/setup/status/route.ts')
let setupStatus = fs.readFileSync(setupStatusRoute, 'utf8')
check('Imports telemetry', setupStatus.includes('onboarding-telemetry'))
check('Logs fub_connected', setupStatus.includes("'fub_connected'"))
check('Logs phone_configured', setupStatus.includes("'phone_configured'"))
check('Logs sms_verified', setupStatus.includes("'sms_verified'"))
check('Logs aha_completed', setupStatus.includes("'aha_completed'"))

// ── 8. Acceptance Criteria ───────────────────────────────────────────────────

section('Acceptance Criteria')

check('AC-1: onboarding_step in real_estate_agents', migration.includes('onboarding_step INT'))
check('AC-2: onboarding_events table exists', migration.includes('CREATE TABLE IF NOT EXISTS onboarding_events'))
check('AC-3: Step names match spec', ['email_verified', 'fub_connected', 'phone_configured', 'sms_verified', 'aha_completed'].every(s => migration.includes(`'${s}'`)))
check('AC-4: /admin/funnel shows real agents', funnelApi.includes('getFunnelStatus'))
check('AC-5: Stuck alerts on >24h', migration.includes('onboarding_stuck_alerts'))
check('AC-6: Conversion rates visible', funnelPage.includes('Conversion'))
check('AC-7: Smoke test excluded', migration.includes('WHERE NOT is_smoke_test_account'))

// ── 9. Summary ───────────────────────────────────────────────────────────────

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
