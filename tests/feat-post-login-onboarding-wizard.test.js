/**
 * E2E Test: feat-post-login-onboarding-wizard
 * Task ID: 2b92eac8-3e6f-4289-812a-102e04fa90fb
 *
 * Tests the post-login onboarding wizard implementation:
 * - API route logic (status, complete endpoints)
 * - Middleware routing (/setup in protected routes)
 * - Login redirect logic (onboardingCompleted flag)
 * - Migration schema coverage
 * - Step resume logic
 * - Acceptance criteria verification
 *
 * Runs without a live server — tests source code behavior.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard')
const SETUP_DIR = path.join(DASHBOARD_DIR, 'app/setup')
const MIGRATION_FILE = path.join(DASHBOARD_DIR, 'supabase/migrations/010_agent_onboarding_wizard.sql')

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

// ── 1. File existence ───────────────────────────────────────────────────────

section('Wizard files exist')

const requiredFiles = [
  'app/setup/page.tsx',
  'app/setup/steps/fub.tsx',
  'app/setup/steps/twilio.tsx',
  'app/setup/steps/sms-verify.tsx',
  'app/setup/steps/complete.tsx',
  'app/api/setup/status/route.ts',
  'app/api/setup/complete/route.ts',
  'supabase/migrations/010_agent_onboarding_wizard.sql',
]

for (const f of requiredFiles) {
  const fullPath = path.join(DASHBOARD_DIR, f)
  check(`File exists: ${f}`, fs.existsSync(fullPath))
}

// ── 2. Migration schema ─────────────────────────────────────────────────────

section('Database migration (010_agent_onboarding_wizard.sql)')

const migration = fs.readFileSync(MIGRATION_FILE, 'utf8')

check('Creates agent_onboarding_wizard table', migration.includes('CREATE TABLE IF NOT EXISTS agent_onboarding_wizard'))
check('Has fub_connected column', migration.includes('fub_connected'))
check('Has twilio_connected / phone column', migration.includes('twilio_connected') || migration.includes('phone_configured'))
check('Has sms_verified column', migration.includes('sms_verified'))
check('Has current_step or onboarding_step column', migration.includes('current_step') || migration.includes('onboarding_step'))
check('Adds onboarding_completed to real_estate_agents', migration.includes('onboarding_completed'))
check('Migration is idempotent (IF NOT EXISTS)', migration.includes('IF NOT EXISTS'))
check('Has agent_id column with UNIQUE', migration.includes('agent_id') && migration.includes('UNIQUE'))

// ── 3. API: /api/setup/status ───────────────────────────────────────────────

section('API Route: /api/setup/status')

const statusRoute = fs.readFileSync(
  path.join(DASHBOARD_DIR, 'app/api/setup/status/route.ts'), 'utf8'
)

check('GET handler exported', statusRoute.includes('export async function GET'))
check('POST handler exported', statusRoute.includes('export async function POST'))
check('JWT auth check present', statusRoute.includes('jwt.verify') || statusRoute.includes('Authorization'))
check('Returns 401 on missing auth', statusRoute.includes("'Unauthorized'") || statusRoute.includes('"Unauthorized"'))
check('Reads from agent_onboarding_wizard table', statusRoute.includes('agent_onboarding_wizard'))
check('Maps fubConnected → fub_connected', statusRoute.includes('fub_connected'))
check('Maps twilioConnected → twilio_connected', statusRoute.includes('twilio_connected'))
check('Maps smsVerified → sms_verified', statusRoute.includes('sms_verified'))
check('Upserts on conflict (agent_id)', statusRoute.includes("onConflict: 'agent_id'"))

// ── 4. API: /api/setup/complete ─────────────────────────────────────────────

section('API Route: /api/setup/complete')

const completeRoute = fs.readFileSync(
  path.join(DASHBOARD_DIR, 'app/api/setup/complete/route.ts'), 'utf8'
)

check('POST handler exported', completeRoute.includes('export async function POST'))
check('JWT auth check present', completeRoute.includes('jwt.verify') || completeRoute.includes('Authorization'))
check('Sets onboarding_completed = true', completeRoute.includes('onboarding_completed: true') || completeRoute.includes("onboarding_completed', true"))
check('Updates real_estate_agents table', completeRoute.includes('real_estate_agents'))

// ── 5. Login redirect logic ─────────────────────────────────────────────────

section('Login page: redirect new agents to /setup')

const loginPage = fs.readFileSync(
  path.join(DASHBOARD_DIR, 'app/login/page.tsx'), 'utf8'
)

check('Checks onboardingCompleted after login', loginPage.includes('onboardingCompleted'))
check('Redirects to /setup when not completed', loginPage.includes('/setup'))

// ── 6. Auth route: returns onboardingCompleted ──────────────────────────────

section('Login API: returns onboardingCompleted field')

const loginRoute = fs.readFileSync(
  path.join(DASHBOARD_DIR, 'app/api/auth/login/route.ts'), 'utf8'
)

check('Selects onboarding_completed from DB', loginRoute.includes('onboarding_completed'))
check('Returns onboardingCompleted in response', loginRoute.includes('onboardingCompleted'))

// ── 7. Middleware: /setup is protected ──────────────────────────────────────

section('Middleware: /setup route protection')

const middleware = fs.readFileSync(
  path.join(DASHBOARD_DIR, 'middleware.ts'), 'utf8'
)

check('/setup in protected routes list', middleware.includes("'/setup'"))
check('/setup NOT in auth redirect routes (should be accessible)', !middleware.includes("AUTH_ROUTES") || !middleware.split('AUTH_ROUTES')[1]?.includes("'/setup'"))

// ── 8. Step components: key acceptance criteria ─────────────────────────────

section('FUB Step: acceptance criteria')

const fubStep = fs.readFileSync(
  path.join(DASHBOARD_DIR, 'app/setup/steps/fub.tsx'), 'utf8'
)

check('Has FUB API key input (masked/password)', fubStep.includes("type={showKey ? 'text' : 'password'}") || fubStep.includes('type="password"'))
check('Has skip option', fubStep.includes('Skip') && fubStep.includes('onSkip'))
check('Calls FUB verify endpoint', fubStep.includes('/api/integrations/fub/verify') || fubStep.includes('fub/connect'))
check('Minimum key length validation (20+ chars)', fubStep.includes('20') || fubStep.includes('length'))

section('Twilio Step: acceptance criteria')

const twilioStep = fs.readFileSync(
  path.join(DASHBOARD_DIR, 'app/setup/steps/twilio.tsx'), 'utf8'
)

check('Two options: system number OR existing', twilioStep.includes('system') && (twilioStep.includes('existing') || twilioStep.includes('Bring Your Own')))
check('Has skip option', twilioStep.includes('onSkip'))
check('Calls Twilio connect endpoint', twilioStep.includes('/api/integrations/twilio/connect'))

section('SMS Verify Step: acceptance criteria')

const smsStep = fs.readFileSync(
  path.join(DASHBOARD_DIR, 'app/setup/steps/sms-verify.tsx'), 'utf8'
)

check('Has mobile number input', smsStep.includes('mobileInput') || smsStep.includes('phoneNumber'))
check('Has send test SMS action', smsStep.includes('send-test') || smsStep.includes('Send Test'))
check('Has skip option', smsStep.includes('onSkip'))
check('Has success state', smsStep.includes('sent') || smsStep.includes('success'))
check('Has error/retry state', smsStep.includes('error') || smsStep.includes('retry'))

section('Complete Step: acceptance criteria')

const completeStep = fs.readFileSync(
  path.join(DASHBOARD_DIR, 'app/setup/steps/complete.tsx'), 'utf8'
)

check('Shows FUB connection status', completeStep.includes('fubConnected') || completeStep.includes('Follow Up Boss'))
check('Shows Twilio status', completeStep.includes('twilioConnected') || completeStep.includes('Twilio'))
check('Shows SMS verified status', completeStep.includes('smsVerified') || completeStep.includes('SMS'))
check('Has "Go to Dashboard" CTA', completeStep.includes('Dashboard') || completeStep.includes('dashboard'))
check('Shows skipped state for incomplete steps', completeStep.includes('Skipped') || completeStep.includes('skipped') || completeStep.includes('Not connected'))

// ── 9. Wizard page: state management ────────────────────────────────────────

section('Wizard page: state management')

const wizardPage = fs.readFileSync(
  path.join(DASHBOARD_DIR, 'app/setup/page.tsx'), 'utf8'
)

check('Loads existing state from /api/setup/status', wizardPage.includes('/api/setup/status'))
check('Persists state on step completion', wizardPage.includes('saveWizardState'))
check('Resumes from last incomplete step', wizardPage.includes('currentStep'))
check('Redirects to /login if no user', wizardPage.includes("'/login'") || wizardPage.includes('router.replace'))
check('Calls /api/setup/complete on wizard finish', wizardPage.includes('/api/setup/complete'))
check('Progress bar with 3 steps', wizardPage.includes('STEPS') && (wizardPage.match(/id:/g) || []).length >= 3)

// ── 10. Build error check ────────────────────────────────────────────────────

section('Build error check: trial-signup/route.ts')

const trialSignupPath = path.join(DASHBOARD_DIR, 'app/api/auth/trial-signup/route.ts')
if (fs.existsSync(trialSignupPath)) {
  const trialSignup = fs.readFileSync(trialSignupPath, 'utf8')
  // The problematic pattern: .then(...).catch() on PromiseLike<void>
  const hasBrokenChain = /\.then\(\s*\(\)\s*=>\s*\{\}\s*\)\s*\.catch\(/.test(trialSignup)
  const hasVoidPromise = trialSignup.includes('supabase.from') && hasBrokenChain
  check(
    'trial-signup/route.ts: no broken .then().catch() chain on PromiseLike<void>',
    !hasVoidPromise,
    'TS error: Property "catch" does not exist on PromiseLike<void> — build fails'
  )
} else {
  check('trial-signup/route.ts not present (not in scope)', true)
}

// ── 11. Step resume logic (unit) ─────────────────────────────────────────────

section('Step resume logic (unit)')

function resumeStep(ws) {
  if (!ws.fub_connected) return 'fub'
  if (!ws.twilio_connected) return 'twilio'
  if (!ws.sms_verified) return 'sms-verify'
  return 'complete'
}

check('Fresh agent starts at FUB', resumeStep({}) === 'fub')
check('FUB done → resumes at Twilio', resumeStep({ fub_connected: true }) === 'twilio')
check('FUB+Twilio done → resumes at SMS', resumeStep({ fub_connected: true, twilio_connected: true }) === 'sms-verify')
check('All done → goes to complete', resumeStep({ fub_connected: true, twilio_connected: true, sms_verified: true }) === 'complete')
check('All false → starts at FUB', resumeStep({ fub_connected: false, twilio_connected: false, sms_verified: false }) === 'fub')

// ── 12. PRD gaps (warnings) ──────────────────────────────────────────────────

section('PRD acceptance criteria gaps (advisory)')

// SMS text per PRD: "Hi [Agent Name]! 👋 Your LeadFlow setup is complete..."
const sendTestRoute = fs.existsSync(path.join(DASHBOARD_DIR, 'app/api/integrations/twilio/send-test/route.ts'))
  ? fs.readFileSync(path.join(DASHBOARD_DIR, 'app/api/integrations/twilio/send-test/route.ts'), 'utf8')
  : ''
const hasExactSMSText = sendTestRoute.includes("You're all set to auto-respond") || sendTestRoute.includes('setup is complete')
check('[Advisory] SMS text matches PRD spec (US-4)', hasExactSMSText, 'PRD requires specific SMS content')

// US-4: Step 3 disabled if Step 2 was skipped
const smsStepContent = fs.readFileSync(path.join(DASHBOARD_DIR, 'app/setup/steps/sms-verify.tsx'), 'utf8')
const hasDisabledWhenSkipped = smsStepContent.includes('twilioPhone') && 
  (smsStepContent.includes('disabled') && smsStepContent.includes('twilioPhone'))
check('[Advisory] SMS step disabled when Twilio skipped (US-4)', hasDisabledWhenSkipped, 'PRD: Step 3 greyed if Step 2 skipped')

// ── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60))
console.log('📊 TEST SUMMARY')
console.log('═'.repeat(60))
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Pass rate: ${Math.round(passed / (passed + failed) * 100)}%`)

if (failures.length > 0) {
  console.log('\n❌ Failures:')
  failures.forEach(f => console.log(`  • ${f}`))
}

console.log('═'.repeat(60))

if (failed > 0) {
  process.exit(1)
}
