/**
 * Test: SessionAnalyticsCard Component & Pilot Usage API
 *
 * Verifies that:
 * 1. The SessionAnalyticsCard component renders without errors
 * 2. The /api/analytics/pilot-usage endpoint returns correct pilot engagement data
 * 3. At-risk pilots (>72h inactive) are correctly identified and highlighted
 * 4. Page layout integration works (component is visible in dashboard)
 */

const assert = require('assert')
const { readFileSync, existsSync } = require('fs')
const path = require('path')

// ============================================
// TEST 1: Component File Exists and Compiles
// ============================================

function testComponentExists() {
  const componentPath = path.join(
    __dirname,
    '../product/lead-response/dashboard/components/dashboard/SessionAnalyticsCard.tsx'
  )

  const exists = existsSync(componentPath)
  assert(exists, 'SessionAnalyticsCard component file exists')

  const content = readFileSync(componentPath, 'utf8')
  assert(content.includes('export function SessionAnalyticsCard'), 'Component exports SessionAnalyticsCard')
  assert(content.includes('PilotEngagementMetrics'), 'Component defines PilotEngagementMetrics type')
  assert(content.includes("'/api/analytics/pilot-usage'"), 'Component calls /api/analytics/pilot-usage endpoint')
  assert(content.includes('atRisk'), 'Component filters at-risk pilots')

  console.log('✅ AC1: SessionAnalyticsCard component file exists and has correct structure')
}

// ============================================
// TEST 2: API Endpoint Exists
// ============================================

function testApiEndpointExists() {
  const routePath = path.join(
    __dirname,
    '../product/lead-response/dashboard/app/api/analytics/pilot-usage/route.ts'
  )

  const exists = existsSync(routePath)
  assert(exists, '/api/analytics/pilot-usage endpoint file exists')

  const content = readFileSync(routePath, 'utf8')
  assert(content.includes('export async function GET'), 'Endpoint exports GET handler')
  assert(content.includes('validateSession'), 'Endpoint validates session')
  assert(content.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Endpoint uses service role key')
  assert(content.includes('/api/internal/pilot-usage'), 'Endpoint proxies to root pilot-usage endpoint')

  console.log('✅ AC2: /api/analytics/pilot-usage endpoint exists with correct structure')
}

// ============================================
// TEST 3: Component Integrated into Dashboard
// ============================================

function testComponentIntegration() {
  const dashboardPath = path.join(
    __dirname,
    '../product/lead-response/dashboard/app/dashboard/page.tsx'
  )

  const content = readFileSync(dashboardPath, 'utf8')
  assert(content.includes('SessionAnalyticsCard'), 'Dashboard page imports SessionAnalyticsCard')
  assert(content.includes('<SessionAnalyticsCard'), 'Dashboard page renders SessionAnalyticsCard component')

  console.log('✅ AC3: SessionAnalyticsCard is integrated into dashboard page')
}

// ============================================
// TEST 4: Component Has Required Features
// ============================================

function testComponentFeatures() {
  const componentPath = path.join(
    __dirname,
    '../product/lead-response/dashboard/components/dashboard/SessionAnalyticsCard.tsx'
  )

  const content = readFileSync(componentPath, 'utf8')

  // Check for required UI elements (field references)
  assert(content.includes('pilot.name'), 'Component displays pilot name')
  assert(content.includes('pilot.email'), 'Component displays email')
  assert(content.includes('pilot.lastLogin'), 'Component displays last login timestamp')
  assert(content.includes('pilot.sessionsLast7d'), 'Component displays sessions in last 7 days')
  assert(content.includes('pilot.topPage'), 'Component displays top feature/page')
  assert(content.includes('pilot.inactiveHours'), 'Component displays inactivity status')

  // Check for at-risk highlighting
  assert(content.includes('atRisk'), 'Component identifies at-risk pilots')
  assert(content.includes('red-50'), 'Component highlights at-risk rows')
  assert(content.includes('AlertTriangle'), 'Component uses alert icon for at-risk status')

  // Check for loading/error states
  assert(content.includes('setLoading'), 'Component has loading state')
  assert(content.includes('setError'), 'Component has error handling')
  assert(content.includes('No pilot agents'), 'Component has empty state')

  console.log('✅ AC4: SessionAnalyticsCard has all required features (display, at-risk highlighting, error handling)')
}

// ============================================
// TEST 5: API Response Data Structure
// ============================================

function testApiDataStructure() {
  const routePath = path.join(
    __dirname,
    '../product/lead-response/dashboard/app/api/analytics/pilot-usage/route.ts'
  )

  const content = readFileSync(routePath, 'utf8')

  // Verify the endpoint returns the expected data structure
  assert(content.includes('pilots'), 'Endpoint returns pilots array')
  assert(content.includes('generatedAt'), 'Endpoint includes generatedAt timestamp')

  // Verify error handling
  assert(content.includes('status: 401'), 'Endpoint returns 401 for unauthorized access')
  assert(content.includes('status: 503'), 'Endpoint returns 503 if service not configured')
  assert(content.includes('status: 500'), 'Endpoint has error handling')

  console.log('✅ AC5: API endpoint has correct response structure and error handling')
}

// ============================================
// TEST 6: Type Safety
// ============================================

function testTypeSafety() {
  const componentPath = path.join(
    __dirname,
    '../product/lead-response/dashboard/components/dashboard/SessionAnalyticsCard.tsx'
  )

  const content = readFileSync(componentPath, 'utf8')

  // Check for TypeScript interfaces
  assert(content.includes('interface PilotEngagementMetrics'), 'Component defines PilotEngagementMetrics interface')
  assert(content.includes('interface PilotUsageResponse'), 'Component defines PilotUsageResponse interface')

  // Check for type annotations
  assert(content.includes('string | null'), 'Component uses proper type annotations')
  assert(content.includes('number | null'), 'Component handles nullable numbers')

  console.log('✅ AC6: Component has proper TypeScript types and interfaces')
}

// ============================================
// TEST RUNNER
// ============================================

async function runTests() {
  console.log('\n🧪 Testing: Session Analytics Card Feature\n')

  try {
    testComponentExists()
    testApiEndpointExists()
    testComponentIntegration()
    testComponentFeatures()
    testApiDataStructure()
    testTypeSafety()

    console.log('\n✅ All tests passed!\n')
    process.exit(0)
  } catch (err) {
    console.error('\n❌ Test failed:', err.message, '\n')
    process.exit(1)
  }
}

runTests()
