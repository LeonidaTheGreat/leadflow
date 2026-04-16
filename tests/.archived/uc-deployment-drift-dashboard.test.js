/**
 * E2E Test: PR #1044 — Fix: Deployment drift — uncommitted dashboard changes
 * Tests: aha moment email routes, simulator routes, vercel.json cron, duplicate route detection
 */

'use strict'
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = '/Users/clawdbot/projects/leadflow/product/lead-response/dashboard'

let passed = 0
let failed = 0

function pass(name) {
  console.log(`PASS: ${name}`)
  passed++
}

function fail(name, reason) {
  console.log(`FAIL: ${name} — ${reason}`)
  failed++
}

// Test 1: vercel.json includes send-trial-emails cron
function testVercelCron() {
  const vercelJson = JSON.parse(fs.readFileSync(path.join(DASHBOARD_DIR, 'vercel.json'), 'utf8'))
  const cronPaths = vercelJson.crons.map(c => c.path)
  if (cronPaths.includes('/api/cron/send-trial-emails')) {
    pass('vercel.json includes send-trial-emails cron')
  } else {
    fail('vercel.json includes send-trial-emails cron', `Crons: ${cronPaths.join(', ')}`)
  }
}

// Test 2: send-aha-day1 route exists and has correct structure
function testSendAhaDay1RouteExists() {
  const routePath = path.join(DASHBOARD_DIR, 'app/api/onboarding/send-aha-day1/route.ts')
  const exists = fs.existsSync(routePath)
  if (!exists) { fail('send-aha-day1 route exists', 'file not found'); return }
  const content = fs.readFileSync(routePath, 'utf8')
  if (!content.includes('export async function POST')) {
    fail('send-aha-day1 has POST handler', 'no POST export')
    return
  }
  if (!content.includes('agentId') && !content.includes('agent_id')) {
    fail('send-aha-day1 validates agentId', 'no agentId check')
    return
  }
  pass('send-aha-day1 route exists with POST handler')
}

// Test 3: send-aha-day3 route exists and has correct structure
function testSendAhaDay3RouteExists() {
  const routePath = path.join(DASHBOARD_DIR, 'app/api/onboarding/send-aha-day3/route.ts')
  const exists = fs.existsSync(routePath)
  if (!exists) { fail('send-aha-day3 route exists', 'file not found'); return }
  const content = fs.readFileSync(routePath, 'utf8')
  if (!content.includes('export async function POST')) {
    fail('send-aha-day3 has POST handler', 'no POST export')
    return
  }
  pass('send-aha-day3 route exists with POST handler')
}

// Test 4: admin metrics aha-moment route has auth
function testAdminAhaMomentAuth() {
  const routePath = path.join(DASHBOARD_DIR, 'app/api/admin/metrics/aha-moment/route.ts')
  const exists = fs.existsSync(routePath)
  if (!exists) { fail('admin metrics aha-moment route exists', 'file not found'); return }
  const content = fs.readFileSync(routePath, 'utf8')
  if (!content.includes('verifyAdminAuth') || !content.includes('401')) {
    fail('admin aha-moment route has auth guard', 'no verifyAdminAuth or 401')
    return
  }
  pass('admin metrics aha-moment route has auth guard')
}

// Test 5: DUPLICATE ROUTE DETECTION — both simulator status routes exist
// This is a spaghetti flag: two routes doing the same thing with different DB clients
function testDuplicateSimulatorStatusRoutes() {
  const route1 = path.join(DASHBOARD_DIR, 'app/api/onboarding/simulator-status/route.ts')
  const route2 = path.join(DASHBOARD_DIR, 'app/api/onboarding/simulator/status/route.ts')
  const both = fs.existsSync(route1) && fs.existsSync(route2)
  if (both) {
    fail('no duplicate simulator status routes',
      'Both /api/onboarding/simulator-status AND /api/onboarding/simulator/status exist — spaghetti. One route should handle all callers.')
    return
  }
  pass('no duplicate simulator status routes')
}

// Test 6: DUPLICATE PAGE DETECTION — both simulator pages exist
function testDuplicateSimulatorPages() {
  const page1 = path.join(DASHBOARD_DIR, 'app/simulator/page.tsx')
  const page2 = path.join(DASHBOARD_DIR, 'app/setup/simulator/page.tsx')
  const both = fs.existsSync(page1) && fs.existsSync(page2)
  if (both) {
    fail('no duplicate simulator pages',
      'Both /simulator/page.tsx AND /setup/simulator/page.tsx exist — duplicated UI logic. Should be one page.')
    return
  }
  pass('no duplicate simulator pages')
}

// Test 7: migration file for aha moment columns exists
function testMigrationExists() {
  const migPath = '/Users/clawdbot/projects/leadflow/migrations/012_trial_aha_moment.sql'
  const exists = fs.existsSync(migPath)
  if (!exists) { fail('migration 012_trial_aha_moment.sql exists', 'file not found'); return }
  const content = fs.readFileSync(migPath, 'utf8')
  if (!content.includes('aha_moment_day1_sent') || !content.includes('aha_moment_day3_sent')) {
    fail('migration adds aha_moment columns', 'columns not in migration')
    return
  }
  pass('migration 012_trial_aha_moment.sql exists with correct columns')
}

// Test 8: AhaMomentBanner calls real API (not hardcoded placeholder)
function testAhaBannerUsesRealApi() {
  const bannerPath = path.join(DASHBOARD_DIR, 'components/dashboard/AhaMomentBanner.tsx')
  const content = fs.readFileSync(bannerPath, 'utf8')
  // Old code had: const hasPendingAha = true // Placeholder
  if (content.includes('hasPendingAha = true')) {
    fail('AhaMomentBanner uses real API not placeholder', 'still contains hardcoded hasPendingAha = true')
    return
  }
  if (!content.includes('/api/onboarding/simulator-status') && !content.includes('/api/onboarding/simulator/status')) {
    fail('AhaMomentBanner calls simulator status API', 'no API call found')
    return
  }
  pass('AhaMomentBanner uses real API call (no placeholder)')
}

// Test 9: email-service.ts exports aha moment functions
function testEmailServiceExports() {
  const emailPath = path.join(DASHBOARD_DIR, 'lib/email-service.ts')
  const content = fs.readFileSync(emailPath, 'utf8')
  if (!content.includes('export async function sendAhaMomentDay1Email')) {
    fail('email-service exports sendAhaMomentDay1Email', 'not found')
    return
  }
  if (!content.includes('export async function sendAhaMomentDay3Email')) {
    fail('email-service exports sendAhaMomentDay3Email', 'not found')
    return
  }
  pass('email-service exports both aha moment email functions')
}

// Test 10: send-aha-day1 does NOT send if already sent (idempotency check in code)
function testSendAhaDay1Idempotency() {
  const routePath = path.join(DASHBOARD_DIR, 'app/api/onboarding/send-aha-day1/route.ts')
  const content = fs.readFileSync(routePath, 'utf8')
  // Should check if email was already sent before sending
  if (!content.includes('already sent') && !content.includes('skipped') && !content.includes('existingEmail')) {
    fail('send-aha-day1 is idempotent', 'no duplicate-send guard found')
    return
  }
  pass('send-aha-day1 has idempotency guard')
}

// Run all tests
testVercelCron()
testSendAhaDay1RouteExists()
testSendAhaDay3RouteExists()
testAdminAhaMomentAuth()
testDuplicateSimulatorStatusRoutes()
testDuplicateSimulatorPages()
testMigrationExists()
testAhaBannerUsesRealApi()
testEmailServiceExports()
testSendAhaDay1Idempotency()

console.log(`\n========================================`)
console.log(`Passed: ${passed} / ${passed + failed}`)
console.log(`Failed: ${failed} / ${passed + failed}`)
console.log(`========================================`)

process.exit(failed > 0 ? 1 : 0)
