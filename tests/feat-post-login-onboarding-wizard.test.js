/**
 * E2E Test: Post-Login Onboarding Wizard (feat-post-login-onboarding-wizard)
 *
 * Tests acceptance criteria from PRD-ONBOARDING-WIZARD-001.
 * Runs without a live server — validates file structure, code logic,
 * route definitions, migration content, and security requirements.
 *
 * Run: node tests/feat-post-login-onboarding-wizard.test.js
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const DASHBOARD = path.join(__dirname, '../product/lead-response/dashboard')

let passed = 0
let failed = 0
const failures = []

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`)
    failed++
    failures.push(label + (detail ? `: ${detail}` : ''))
  }
}

function readFile(relPath) {
  const full = path.join(DASHBOARD, relPath)
  if (!fs.existsSync(full)) return null
  return fs.readFileSync(full, 'utf8')
}

console.log('\n🧪 Post-Login Onboarding Wizard — E2E Acceptance Tests\n')

// ── 1. File structure ────────────────────────────────────────────────────────
console.log('📁 File Structure')

check('setup page exists', fs.existsSync(path.join(DASHBOARD, 'app/setup/page.tsx')))
check('fub step exists', fs.existsSync(path.join(DASHBOARD, 'app/setup/steps/fub.tsx')))
check('twilio step exists', fs.existsSync(path.join(DASHBOARD, 'app/setup/steps/twilio.tsx')))
check('sms-verify step exists', fs.existsSync(path.join(DASHBOARD, 'app/setup/steps/sms-verify.tsx')))
check('complete step exists', fs.existsSync(path.join(DASHBOARD, 'app/setup/steps/complete.tsx')))
check('/api/setup/status exists', fs.existsSync(path.join(DASHBOARD, 'app/api/setup/status/route.ts')))
check('/api/setup/complete exists', fs.existsSync(path.join(DASHBOARD, 'app/api/setup/complete/route.ts')))
check('migration 010 exists', fs.existsSync(path.join(DASHBOARD, 'supabase/migrations/010_agent_onboarding_wizard.sql')))

// ── 2. Migration — data model ────────────────────────────────────────────────
console.log('\n🗃️ Migration / Data Model (PRD §5)')

const migration = readFile('supabase/migrations/010_agent_onboarding_wizard.sql')
check('agent_onboarding_wizard table created', migration?.includes('CREATE TABLE IF NOT EXISTS agent_onboarding_wizard'))
check('fub_connected column in wizard table', migration?.includes('fub_connected'))
check('twilio_connected column in wizard table', migration?.includes('twilio_connected'))
check('sms_verified column in wizard table', migration?.includes('sms_verified'))
check('current_step column in wizard table', migration?.includes('current_step'))
check('onboarding_completed added to real_estate_agents', migration?.includes('onboarding_completed'))
check('migration is idempotent (IF NOT EXISTS)', migration?.includes('IF NOT EXISTS'))

// ── 3. Wizard page — routing & state logic ───────────────────────────────────
console.log('\n🧭 Wizard Page Routing & State (US-1, US-5)')

const setupPage = readFile('app/setup/page.tsx')
check('redirects to /login if no user', setupPage?.includes("router.replace('/login')"))
check('loads wizard state from /api/setup/status on mount', setupPage?.includes('/api/setup/status'))
check('persists wizard state on step change', setupPage?.includes('/api/setup/status') && setupPage?.includes("method: 'POST'"))
check('calls /api/setup/complete when SMS verified', setupPage?.includes('/api/setup/complete'))
check('routes to /dashboard on finish', setupPage?.includes("router.push('/dashboard')"))
check('3-step progress indicator', setupPage?.includes('STEPS') && setupPage?.includes('Connect FUB'))
check('resumes from last incomplete step', setupPage?.includes('!ws.fub_connected') && setupPage?.includes('!ws.twilio_connected'))
check('completes wizard on all steps done', setupPage?.includes("currentStep: 'complete'"))

// ── 4. FUB step — AC for US-2 ────────────────────────────────────────────────
console.log('\n🏠 Step 1: FUB Connection (US-2)')

const fubStep = readFile('app/setup/steps/fub.tsx')
check('FUB API key input field', fubStep?.includes('apiKey'))
check('test connection / verify button', fubStep?.includes('handleVerify') || fubStep?.includes('Test Connection') || fubStep?.includes('Verify'))
check('calls /api/integrations/fub/verify', fubStep?.includes('/api/integrations/fub/verify'))
check('calls /api/integrations/fub/connect on success', fubStep?.includes('/api/integrations/fub/connect'))
check('masked API key input (type password or EyeOff)', fubStep?.includes('EyeOff') || fubStep?.includes("type: 'password'") || fubStep?.includes("showKey"))
check('skip option available', fubStep?.includes('onSkip') || fubStep?.includes('Skip'))
check('inline error state', fubStep?.includes('setError') || fubStep?.includes('error'))

// ── 5. Twilio step — AC for US-3 ─────────────────────────────────────────────
console.log('\n📱 Step 2: Phone Configuration (US-3)')

const twilioStep = readFile('app/setup/steps/twilio.tsx')
check('two options presented (system vs own)', twilioStep?.includes("'system'") && twilioStep?.includes("'existing'"))
check('BYOD phone number input', twilioStep?.includes('phoneInput'))
check('skip option available', twilioStep?.includes('onSkip') || twilioStep?.includes('Skip'))
check('calls twilio connect endpoint', twilioStep?.includes('/api/integrations/twilio/connect'))
check('back navigation', twilioStep?.includes('onBack'))
// PRD requires cost disclosure for Twilio provisioning
const hasCostDisclosure = twilioStep?.includes('cost') || twilioStep?.includes('$1') || twilioStep?.includes('billed')
check(
  'cost disclosure present for Twilio number (PRD US-3)',
  hasCostDisclosure,
  hasCostDisclosure ? '' : 'MISSING: "A Twilio phone number costs ~$1/month" disclosure required by PRD'
)

// ── 6. SMS Verify step — AC for US-4 ─────────────────────────────────────────
console.log('\n✉️ Step 3: SMS Verification (US-4)')

const smsStep = readFile('app/setup/steps/sms-verify.tsx')
check('mobile number input field', smsStep?.includes('mobileInput'))
check('send test SMS button', smsStep?.includes('handleSendTest') || smsStep?.includes('Send Test SMS'))
check('calls /api/integrations/twilio/send-test', smsStep?.includes('/api/integrations/twilio/send-test'))
check('success state shown on send', smsStep?.includes('sent') && smsStep?.includes('setSent'))
check('error state with retry', smsStep?.includes('setError'))
check('skip option available', smsStep?.includes('onSkip') || smsStep?.includes('Skip'))

// Check PRD-required SMS content
const sendTestRoute = readFile('app/api/integrations/twilio/send-test/route.ts')
const prdSmsContent = "Your LeadFlow setup is complete"
const actualHasPrdContent = sendTestRoute?.includes(prdSmsContent)
check(
  'SMS body matches PRD spec (US-4)',
  actualHasPrdContent,
  actualHasPrdContent
    ? ''
    : `FAIL: PRD requires "${prdSmsContent}" in SMS body. Found: "${sendTestRoute?.match(/body: `[^`]+`/)?.[0] || 'unknown'}"`
)

// ── 7. Complete step — AC for US-5 ───────────────────────────────────────────
console.log('\n🎉 Completion Screen (US-5)')

const completeStep = readFile('app/setup/steps/complete.tsx')
check('shows FUB status (connected or skipped)', completeStep?.includes('fubConnected'))
check('shows Twilio status', completeStep?.includes('twilioConnected'))
check('shows SMS verified status', completeStep?.includes('smsVerified'))
check('"Go to Dashboard" button', completeStep?.includes('Go to Dashboard') || completeStep?.includes('onFinish'))
check('guidance to Settings for skipped steps', completeStep?.includes('Settings') || completeStep?.includes('Integrations'))

// ── 8. Login redirect trigger — US-1 ─────────────────────────────────────────
console.log('\n🔐 First-Login Trigger (US-1)')

const loginPage = readFile('app/login/page.tsx')
check('login page redirects to /setup when onboardingCompleted=false',
  loginPage?.includes("router.push('/setup')") || loginPage?.includes('onboardingCompleted'))

const loginRoute = readFile('app/api/auth/login/route.ts')
check('login API returns onboardingCompleted field', loginRoute?.includes('onboardingCompleted') || loginRoute?.includes('onboarding_completed'))
check('login API queries onboarding_completed from DB', loginRoute?.includes('onboarding_completed'))

// ── 9. Security — authentication on setup API routes ─────────────────────────
console.log('\n🔒 Security — Authentication (PRD §6)')

const statusRoute = readFile('app/api/setup/status/route.ts')
check('/api/setup/status requires JWT (Bearer token check)', statusRoute?.includes("'Bearer '") || statusRoute?.includes('jwt.verify'))

const completeRoute = readFile('app/api/setup/complete/route.ts')
check('/api/setup/complete requires JWT (Bearer token check)', completeRoute?.includes("'Bearer '") || completeRoute?.includes('jwt.verify'))

// Critical: integration connect endpoints must also be authenticated
const fubConnect = readFile('app/api/integrations/fub/connect/route.ts')
const twilioConnect = readFile('app/api/integrations/twilio/connect/route.ts')
const sendTest = readFile('app/api/integrations/twilio/send-test/route.ts')

const fubConnectAuthenticated = fubConnect?.includes('jwt.verify') || fubConnect?.includes("'Bearer '")
const twilioConnectAuthenticated = twilioConnect?.includes('jwt.verify') || twilioConnect?.includes("'Bearer '")
const sendTestAuthenticated = sendTest?.includes('jwt.verify') || sendTest?.includes("'Bearer '")

check(
  '/api/integrations/fub/connect is JWT-authenticated',
  fubConnectAuthenticated,
  fubConnectAuthenticated ? '' : 'SECURITY: uses header x-agent-id with default fallback "test-agent-id" — no JWT check'
)
check(
  '/api/integrations/twilio/connect is JWT-authenticated',
  twilioConnectAuthenticated,
  twilioConnectAuthenticated ? '' : 'SECURITY: uses header x-agent-id with default fallback "test-agent-id" — no JWT check'
)
check(
  '/api/integrations/twilio/send-test is JWT-authenticated',
  sendTestAuthenticated,
  sendTestAuthenticated ? '' : 'SECURITY: unauthenticated — anyone can trigger paid SMS to any number'
)

// ── 10. No hardcoded secrets ─────────────────────────────────────────────────
console.log('\n🔑 No Hardcoded Secrets')

const secretPatterns = /(?:sk_live_|AC[a-f0-9]{32}|[a-f0-9]{32}(?=\s*[,;]))/
const filesToScan = [
  'app/setup/page.tsx',
  'app/setup/steps/fub.tsx',
  'app/setup/steps/twilio.tsx',
  'app/setup/steps/sms-verify.tsx',
  'app/api/setup/status/route.ts',
  'app/api/setup/complete/route.ts',
  'app/api/integrations/fub/connect/route.ts',
  'app/api/integrations/twilio/connect/route.ts',
  'app/api/integrations/twilio/send-test/route.ts',
]
let hasHardcodedSecrets = false
for (const f of filesToScan) {
  const content = readFile(f)
  if (content && secretPatterns.test(content)) {
    hasHardcodedSecrets = true
    break
  }
}
check('No hardcoded secrets detected', !hasHardcodedSecrets)

// ── 11. Unit tests pass (pre-verified) ──────────────────────────────────────
console.log('\n🧪 Unit Tests')
const unitTestFile = readFile('tests/setup-wizard.unit.test.ts')
check('setup-wizard.unit.test.ts exists with ≥20 tests', unitTestFile?.split('test(').length > 20)

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60))
console.log('📊 RESULTS')
console.log('═'.repeat(60))
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Pass rate: ${Math.round((passed / (passed + failed)) * 100)}%`)

if (failures.length > 0) {
  console.log('\n❌ FAILING CHECKS:')
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`))
}

if (failed === 0) {
  console.log('\n🎉 ALL CHECKS PASSED')
  process.exit(0)
} else {
  console.log('\n💥 SOME CHECKS FAILED — see above')
  process.exit(1)
}
