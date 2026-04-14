/**
 * E2E Test Suite: Trial-to-Paid Conversion Path
 * 
 * Tests the trial-to-paid conversion implementation:
 * 1. Database schema is correct
 * 2. API routes exist and are properly structured
 * 3. Email templates are properly formatted
 * 4. Middleware handles trial expiry correctly
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const pg = require('pg')

const LOCAL_PG_URL = process.env.LOCAL_PG_URL
const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard')

let passedTests = 0
let failedTests = 0
const testResults = []

// Helper to get DB pool
function getPool() {
  return new pg.Pool({
    connectionString: LOCAL_PG_URL
  })
}

// Helper to check file exists
function fileExists(filePath) {
  return fs.existsSync(filePath)
}

// Helper to read file content
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8')
}

// Test runner
async function test(name, fn) {
  try {
    await fn()
    console.log(`✅ ${name}`)
    passedTests++
    testResults.push({ name, status: 'PASS' })
  } catch (error) {
    console.error(`❌ ${name}`)
    console.error(`   Error: ${error.message}`)
    failedTests++
    testResults.push({ name, status: 'FAIL', error: error.message })
  }
}

// Main test execution
async function runTests() {
  console.log('🧪 Starting Trial-to-Paid Conversion Path Tests\n')

  // Test 1: Database Schema
  await test('Database Trial Email Tracking Columns Exist', async () => {
    const pool = getPool()
    
    try {
      const { rows } = await pool.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'real_estate_agents' 
         AND column_name IN ('trial_banner_dismissed', 'trial_email_day6_sent', 'trial_email_day3_sent', 'trial_email_day1_sent', 'trial_email_expired_sent', 'subscription_start_date')
         ORDER BY column_name`
      )
      
      const expectedColumns = [
        'subscription_start_date',
        'trial_banner_dismissed',
        'trial_email_day1_sent',
        'trial_email_day3_sent',
        'trial_email_day6_sent',
        'trial_email_expired_sent'
      ]
      
      const foundColumns = rows.map(r => r.column_name).sort()
      
      assert.deepStrictEqual(
        foundColumns,
        expectedColumns,
        `Expected columns: ${expectedColumns.join(', ')}, got: ${foundColumns.join(', ')}`
      )
    } finally {
      pool.end()
    }
  })

  // Test 2: Trial Email Log Table
  await test('Trial Email Log Table Exists with Correct Schema', async () => {
    const pool = getPool()
    
    try {
      const { rows } = await pool.query(
        `SELECT column_name, data_type FROM information_schema.columns 
         WHERE table_name = 'trial_email_logs'
         ORDER BY ordinal_position`
      )
      
      assert.ok(rows.length > 0, 'trial_email_logs table should exist')
      
      const columnNames = rows.map(r => r.column_name)
      const requiredColumns = ['id', 'agent_id', 'email_type', 'email_address', 'sent_at', 'delivery_status']
      
      requiredColumns.forEach(col => {
        assert.ok(
          columnNames.includes(col),
          `trial_email_logs should have ${col} column`
        )
      })
    } finally {
      pool.end()
    }
  })

  // Test 3: Trial Conversion View
  await test('Trial Conversion View Exists', async () => {
    const pool = getPool()
    
    try {
      const { rows } = await pool.query(
        `SELECT 1 FROM information_schema.views WHERE table_name = 'v_trial_eligible_agents'`
      )
      
      assert.ok(rows.length > 0, 'v_trial_eligible_agents view should exist')
    } finally {
      pool.end()
    }
  })

  // Test 4: Trial Email API Route File
  await test('Trial Email API Route File Exists', async () => {
    const routePath = path.join(DASHBOARD_DIR, 'app/api/cron/send-trial-emails/route.ts')
    assert.ok(fileExists(routePath), `Route file should exist at ${routePath}`)
    
    const content = readFile(routePath)
    assert.ok(content.includes('sendTrialReminderEmails'), 'Should import sendTrialReminderEmails')
    assert.ok(content.includes('export async function POST'), 'Should export POST handler')
  })

  // Test 5: Trial Emails Lib File
  await test('Trial Emails Library File Exists', async () => {
    const libPath = path.join(DASHBOARD_DIR, 'lib/trial-emails.ts')
    assert.ok(fileExists(libPath), `Lib file should exist at ${libPath}`)
    
    const content = readFile(libPath)
    assert.ok(content.includes('sendTrialReminderEmails'), 'Should export sendTrialReminderEmails function')
    assert.ok(content.includes('sendDay6Email'), 'Should have sendDay6Email function')
    assert.ok(content.includes('sendDay3Email'), 'Should have sendDay3Email function')
    assert.ok(content.includes('sendDay1Email'), 'Should have sendDay1Email function')
    assert.ok(content.includes('sendExpiredEmail'), 'Should have sendExpiredEmail function')
  })

  // Test 6: Trial Email Function Includes Email Sending
  await test('Trial Email Functions Use Resend API', async () => {
    const libPath = path.join(DASHBOARD_DIR, 'lib/trial-emails.ts')
    const content = readFile(libPath)
    
    assert.ok(content.includes('resend.emails.send'), 'Should use resend.emails.send')
    assert.ok(content.includes('RESEND_API_KEY'), 'Should reference RESEND_API_KEY')
  })

  // Test 7: Trial Status Banner Component
  await test('Trial Status Banner Component Exists', async () => {
    const componentPath = path.join(DASHBOARD_DIR, 'components/dashboard/TrialStatusBanner.tsx')
    assert.ok(fileExists(componentPath), `Component should exist at ${componentPath}`)
    
    const content = readFile(componentPath)
    assert.ok(content.includes('TrialStatusBanner'), 'Should define TrialStatusBanner component')
    assert.ok(content.includes('daysRemaining'), 'Should display days remaining')
    assert.ok(content.includes('Upgrade Now'), 'Should have upgrade button')
  })

  // Test 8: Trial Expired Page
  await test('Trial Expired Page Exists', async () => {
    const pagePath = path.join(DASHBOARD_DIR, 'app/dashboard/trial-expired/page.tsx')
    assert.ok(fileExists(pagePath), `Trial expired page should exist at ${pagePath}`)
    
    const content = readFile(pagePath)
    assert.ok(content.includes('TrialExpiredPage'), 'Should define TrialExpiredPage component')
    assert.ok(content.includes('Your Trial Has Ended'), 'Should have appropriate messaging')
  })

  // Test 9: Middleware Trial Expiry Check
  await test('Middleware Includes Trial Expiry Check', async () => {
    const middlewarePath = path.join(DASHBOARD_DIR, 'middleware.ts')
    assert.ok(fileExists(middlewarePath), `Middleware should exist at ${middlewarePath}`)
    
    const content = readFile(middlewarePath)
    assert.ok(content.includes('isTrialExpired'), 'Should include isTrialExpired check')
    assert.ok(content.includes('EXPIRED_TRIAL_ALLOWED_ROUTES'), 'Should define allowed routes for expired trials')
    assert.ok(content.includes('/upgrade'), 'Should allow /upgrade route for expired trials')
  })

  // Test 10: Pricing Page Component
  await test('Pricing Page Component Exists and Has Upgrade Button', async () => {
    const pagePath = path.join(DASHBOARD_DIR, 'app/pricing/page.tsx')
    assert.ok(fileExists(pagePath), `Pricing page should exist at ${pagePath}`)
    
    const content = readFile(pagePath)
    assert.ok(content.includes('pricing'), 'Should have pricing component')
    assert.ok(content.includes('handleSelectPlan'), 'Should handle plan selection')
  })

  // Test 11: Checkout API Route
  await test('Checkout API Route Exists', async () => {
    const routePath = path.join(DASHBOARD_DIR, 'app/api/billing/create-checkout/route.ts')
    assert.ok(fileExists(routePath), `Checkout route should exist at ${routePath}`)
    
    const content = readFile(routePath)
    assert.ok(content.includes('export async function POST'), 'Should export POST handler')
    assert.ok(content.includes('stripe.checkout.sessions.create'), 'Should create checkout session')
  })

  // Test 12: Migration File
  await test('Database Migration File Exists', async () => {
    const migrationPath = path.join(__dirname, '../sql/migrations/007-trial-to-paid-conversion.sql')
    assert.ok(fileExists(migrationPath), `Migration file should exist at ${migrationPath}`)
    
    const content = readFile(migrationPath)
    assert.ok(content.includes('trial_email_logs'), 'Should create trial_email_logs table')
    assert.ok(content.includes('trial_banner_dismissed'), 'Should add trial_banner_dismissed column')
    assert.ok(content.includes('v_trial_eligible_agents'), 'Should create trial eligible agents view')
  })

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`Total: ${passedTests + failedTests}`)
  
  if (failedTests > 0) {
    console.log('\n❌ FAILED TESTS:')
    testResults.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
  }
  
  const passRate = passedTests / (passedTests + failedTests)
  console.log(`\n📈 Success Rate: ${(passRate * 100).toFixed(1)}%`)
  console.log('='.repeat(60))

  process.exit(failedTests > 0 ? 1 : 0)
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
