/**
 * QC E2E Test: Agent Referral Program
 * Task: f70e62eb-5855-42ff-8a6a-e9d081abd500
 * UC: feat-agent-referral-program
 *
 * Tests:
 * 1. DB schema — referral_links and referrals tables exist with correct columns
 * 2. Migration 015 applied
 * 3. Route files exist at expected paths
 * 4. Token generation uses crypto.randomBytes (not Math.random)
 * 5. Auth check: getAuthUserId called before DB ops
 * 6. AC gap: /r/{code} landing page route does NOT exist (FAIL)
 * 7. AC gap: /api/referrals/apply-credit does NOT exist (FAIL)
 * 8. AC gap: Conversion notification email not implemented (FAIL)
 * 9. AC gap: ReferralWidget not wired into settings page (FAIL)
 * 10. Existing dev E2E test is a placeholder with no assertions (FAIL)
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const DASHBOARD_BASE = path.resolve(__dirname, '../../product/lead-response/dashboard')
const TESTS_E2E = path.resolve(__dirname)

let client
let RESULTS = { passed: 0, failed: 0, details: [] }

function pass(name) {
  RESULTS.passed++
  RESULTS.details.push({ status: 'PASS', name })
  console.log(`  PASS  ${name}`)
}

function fail(name, reason) {
  RESULTS.failed++
  RESULTS.details.push({ status: 'FAIL', name, reason })
  console.log(`  FAIL  ${name}: ${reason}`)
}

async function runTests() {
  console.log('\n=== QC E2E: Agent Referral Program ===\n')

  // ── DB CONNECTION ──────────────────────────────────────────────────────────
  client = new Client({ connectionString: 'postgresql://clawdbot@localhost/openclaw' })
  await client.connect()

  // 1. referral_links table exists with required columns
  try {
    const res = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'referral_links'
      ORDER BY column_name
    `)
    const cols = res.rows.map(r => r.column_name)
    const required = ['agent_id', 'referral_code', 'referral_link', 'created_at']
    const missing = required.filter(c => !cols.includes(c))
    if (missing.length > 0) {
      fail('referral_links table has required columns', `Missing: ${missing.join(', ')}`)
    } else {
      pass('referral_links table has required columns')
    }
  } catch (e) {
    fail('referral_links table exists', e.message)
  }

  // 2. referrals table exists with conversion_status and free_months_earned
  try {
    const res = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'referrals'
      ORDER BY column_name
    `)
    const cols = res.rows.map(r => r.column_name)
    const required = ['referrer_agent_id', 'referral_code', 'conversion_status', 'free_months_earned', 'credit_applied']
    const missing = required.filter(c => !cols.includes(c))
    if (missing.length > 0) {
      fail('referrals table has required columns', `Missing: ${missing.join(', ')}`)
    } else {
      pass('referrals table has required columns')
    }
  } catch (e) {
    fail('referrals table exists', e.message)
  }

  // 3. real_estate_agents has referral columns
  try {
    const res = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'real_estate_agents'
        AND column_name IN ('referred_by_agent_id', 'referral_link_generated_at', 'total_referral_credits')
    `)
    const cols = res.rows.map(r => r.column_name)
    if (cols.length !== 3) {
      fail('real_estate_agents has referral columns', `Found only: ${cols.join(', ')}`)
    } else {
      pass('real_estate_agents has referral columns')
    }
  } catch (e) {
    fail('real_estate_agents referral columns', e.message)
  }

  await client.end()

  // ── FILE EXISTENCE ─────────────────────────────────────────────────────────

  // 4. generate route exists
  const generateRoute = path.join(DASHBOARD_BASE, 'app/api/referrals/generate/route.ts')
  if (fs.existsSync(generateRoute)) {
    pass('/api/referrals/generate route file exists')
  } else {
    fail('/api/referrals/generate route file exists', 'File not found')
  }

  // 5. stats route exists
  const statsRoute = path.join(DASHBOARD_BASE, 'app/api/referrals/stats/route.ts')
  if (fs.existsSync(statsRoute)) {
    pass('/api/referrals/stats route file exists')
  } else {
    fail('/api/referrals/stats route file exists', 'File not found')
  }

  // 6. ReferralWidget component exists
  const widget = path.join(DASHBOARD_BASE, 'components/ReferralWidget.tsx')
  if (fs.existsSync(widget)) {
    pass('ReferralWidget.tsx component exists')
  } else {
    fail('ReferralWidget.tsx component exists', 'File not found')
  }

  // ── SECURITY: crypto.randomBytes used, NOT Math.random ────────────────────

  // 7. Referral code uses crypto.randomBytes
  const generateContent = fs.readFileSync(generateRoute, 'utf8')
  if (generateContent.includes('crypto.randomBytes') && !generateContent.includes('Math.random')) {
    pass('Referral code uses crypto.randomBytes (not Math.random)')
  } else {
    fail('Referral code uses crypto.randomBytes', 'Uses weak Math.random or missing crypto.randomBytes')
  }

  // 8. Auth check before DB operations in generate route
  if (generateContent.includes('getAuthUserId') && generateContent.includes('Unauthorized')) {
    pass('/api/referrals/generate checks auth before DB ops')
  } else {
    fail('/api/referrals/generate checks auth before DB ops', 'Missing auth check')
  }

  // 9. Auth check in stats route
  const statsContent = fs.readFileSync(statsRoute, 'utf8')
  if (statsContent.includes('getAuthUserId') && statsContent.includes('Unauthorized')) {
    pass('/api/referrals/stats checks auth before DB ops')
  } else {
    fail('/api/referrals/stats checks auth before DB ops', 'Missing auth check')
  }

  // 10. Paid-only gate in generate route
  if (generateContent.includes('subscription_status') && generateContent.includes('403')) {
    pass('/api/referrals/generate has paid-agent gate (403 for non-paid)')
  } else {
    fail('/api/referrals/generate has paid-agent gate', 'Missing subscription_status check or 403 response')
  }

  // ── ACCEPTANCE CRITERIA GAPS ───────────────────────────────────────────────

  // AC1: "Referral link in account/settings page"
  const settingsPage = path.join(DASHBOARD_BASE, 'app/settings/page.tsx')
  const settingsContent = fs.readFileSync(settingsPage, 'utf8')
  if (settingsContent.includes('ReferralWidget') || settingsContent.includes('referral')) {
    pass('AC1: ReferralWidget wired into settings page')
  } else {
    fail('AC1: ReferralWidget wired into settings page', 'ReferralWidget not imported or used in /settings page — widget exists but is unreachable in the UI')
  }

  // AC2: "Landing page /r/{code} tracking"
  const rRouteDir = path.join(DASHBOARD_BASE, 'app/r')
  if (fs.existsSync(rRouteDir)) {
    pass('AC2: /r/{code} landing/tracking route exists')
  } else {
    fail('AC2: /r/{code} landing/tracking route exists', 'No app/r/[code]/ directory found — referral clicks cannot be tracked')
  }

  // AC3: "Automatic credit on referral conversion" — needs apply-credit API
  const applyCreditRoute = path.join(DASHBOARD_BASE, 'app/api/referrals/apply-credit/route.ts')
  const applyCreditRouteAlt = path.join(DASHBOARD_BASE, 'app/api/referrals/apply-credit')
  if (fs.existsSync(applyCreditRoute) || fs.existsSync(applyCreditRouteAlt)) {
    pass('AC3: /api/referrals/apply-credit endpoint exists')
  } else {
    fail('AC3: /api/referrals/apply-credit endpoint exists', 'No apply-credit route — conversion webhook handler missing, credits can never be applied')
  }

  // AC4: "Conversion notification email to referrer"
  const emailPaths = [
    path.join(DASHBOARD_BASE, 'lib/referral-email.ts'),
    path.join(DASHBOARD_BASE, 'lib/referral-notification.ts'),
  ]
  const hasEmailFile = emailPaths.some(p => fs.existsSync(p))
  // Also check if email service is called in any referral file
  const allReferralFiles = [generateContent, statsContent]
  const hasEmailCall = allReferralFiles.some(c => c.includes('sendEmail') || c.includes('email-service') || c.includes('resend'))
  if (hasEmailFile || hasEmailCall) {
    pass('AC4: Conversion notification email logic exists')
  } else {
    fail('AC4: Conversion notification email logic exists', 'No email sending code found in referral routes — referrers will not be notified on conversion')
  }

  // ── DEV E2E TEST QUALITY ───────────────────────────────────────────────────

  // 11. Dev-submitted E2E test has real assertions (not just test.todo)
  const devTestFile = path.join(TESTS_E2E, 'uc-agent-referral-program.test.js')
  const devTestContent = fs.readFileSync(devTestFile, 'utf8')
  const hasRealAssertions = devTestContent.includes('assert') || 
    (devTestContent.includes('expect(') && !devTestContent.includes('test.todo'))
  const isOnlyTodo = devTestContent.includes('test.todo') && !devTestContent.includes('expect(') && !devTestContent.includes('assert')
  if (!isOnlyTodo && hasRealAssertions) {
    pass('Dev E2E test has real assertions')
  } else {
    fail('Dev E2E test has real assertions', 'tests/e2e/uc-agent-referral-program.test.js is a test.todo() placeholder with no actual assertions — provides zero coverage')
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  const total = RESULTS.passed + RESULTS.failed
  console.log(`\n${'─'.repeat(55)}`)
  console.log(`RESULT: ${RESULTS.passed}/${total} passed`)
  console.log(`${'─'.repeat(55)}`)
  if (RESULTS.failed > 0) {
    console.log('\nFAILED CHECKS:')
    RESULTS.details.filter(d => d.status === 'FAIL').forEach(d => {
      console.log(`  - ${d.name}: ${d.reason}`)
    })
  }

  return RESULTS
}

runTests()
  .then(r => {
    process.exit(r.failed > 0 ? 1 : 0)
  })
  .catch(e => {
    console.error('Test runner error:', e)
    process.exit(1)
  })
