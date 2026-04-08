/**
 * QC Independent E2E Test: ROI Visibility Fix
 * Task: 64c43e99-81e0-4734-b933-3f3718a636d9
 *
 * Tests the live API at NEXT_PUBLIC_API_URL for unauthenticated 401 guard,
 * validates the route file for correct table references and auth,
 * and confirms the widget is exported correctly from the component.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const http = require('https')

const DASHBOARD = path.resolve(__dirname, '../../product/lead-response/dashboard')
const routePath = path.join(DASHBOARD, 'app/api/metrics/roi/route.ts')
const widgetPath = path.join(DASHBOARD, 'components/dashboard/RoiMetricsWidget.tsx')
const dashboardPage = path.join(DASHBOARD, 'app/dashboard/page.tsx')

let passed = 0
let failed = 0

function pass(name) {
  passed++
  console.log(`  PASS  ${name}`)
}
function fail(name, reason) {
  failed++
  console.log(`  FAIL  ${name}: ${reason}`)
}

async function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers: { 'Accept': 'application/json' } }, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

async function main() {
  console.log('\n=== QC INDEPENDENT E2E: ROI Visibility (64c43e99) ===\n')

  // 1. Route file exists
  if (fs.existsSync(routePath)) {
    pass('ROI API route file exists')
  } else {
    fail('ROI API route file exists', 'Not found: ' + routePath)
    process.exit(1)
  }

  const routeContent = fs.readFileSync(routePath, 'utf8')

  // 2. No calcom_bookings references (was the root bug)
  if (!routeContent.includes('calcom_bookings')) {
    pass('calcom_bookings removed from route (was 500-causing bug)')
  } else {
    fail('calcom_bookings removed from route', 'Still references nonexistent table calcom_bookings')
  }

  // 3. Uses bookings table
  if (routeContent.includes(".from('bookings')")) {
    pass("Route uses correct 'bookings' table")
  } else {
    fail("Route uses correct 'bookings' table", "bookings table reference not found")
  }

  // 4. Auth enforced — no agent_id from query params
  if (routeContent.includes('getAuthUserId') && !routeContent.includes("searchParams.get('agent_id')")) {
    pass('Auth: agent_id from session only, not query params')
  } else {
    fail('Auth: agent_id from session only', 'Missing getAuthUserId or accepts query param agent_id')
  }

  // 5. Response shape has all 4 required fields
  const requiredFields = ['leadsResponded', 'avgResponseTimeSeconds', 'appointmentsBookedThisMonth', 'estimatedRevenueProtected']
  for (const field of requiredFields) {
    if (routeContent.includes(field)) {
      pass(`Route response includes '${field}'`)
    } else {
      fail(`Route response includes '${field}'`, `${field} not found in route.ts`)
    }
  }

  // 6. Widget exported as named export (not default)
  if (fs.existsSync(widgetPath)) {
    const widgetContent = fs.readFileSync(widgetPath, 'utf8')
    if (widgetContent.includes('export function RoiMetricsWidget')) {
      pass('RoiMetricsWidget exported as named export')
    } else {
      fail('RoiMetricsWidget exported as named export', 'Cannot find named export in widget file')
    }
  } else {
    fail('RoiMetricsWidget component exists', 'Not found: ' + widgetPath)
  }

  // 7. Dashboard page imports and uses the widget
  if (fs.existsSync(dashboardPage)) {
    const pageContent = fs.readFileSync(dashboardPage, 'utf8')
    if (pageContent.includes('RoiMetricsWidget')) {
      pass('Dashboard page references RoiMetricsWidget')
    } else {
      fail('Dashboard page references RoiMetricsWidget', 'Not found in page.tsx')
    }
  } else {
    fail('Dashboard page exists', 'page.tsx not found')
  }

  // 8. Live API 401s for unauthenticated request
  const apiUrl = 'https://leadflow-ai-five.vercel.app/api/metrics/roi'
  try {
    const res = await httpGet(apiUrl)
    if (res.status === 401) {
      pass('Live API /api/metrics/roi returns 401 for unauthenticated request')
    } else if (res.status === 500) {
      fail('Live API /api/metrics/roi returns 401 for unauthenticated request', `Got 500 — route erroring out (may still reference bad table or misconfigured env). Body: ${res.body.slice(0, 200)}`)
    } else {
      fail('Live API /api/metrics/roi returns 401 for unauthenticated request', `Expected 401, got ${res.status}. Body: ${res.body.slice(0, 200)}`)
    }
  } catch (e) {
    fail('Live API /api/metrics/roi reachable', `Request failed: ${e.message}`)
  }

  // 9. DB: bookings table has agent_id column
  let client
  try {
    client = new Client({ connectionString: 'postgresql://clawdbot@localhost/openclaw' })
    await client.connect()
    const res = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'bookings' AND column_name IN ('id', 'agent_id', 'created_at')
    `)
    const cols = res.rows.map(r => r.column_name)
    const missing = ['id', 'agent_id', 'created_at'].filter(c => !cols.includes(c))
    if (missing.length === 0) {
      pass("bookings table has id, agent_id, created_at columns for ROI query")
    } else {
      fail("bookings table has required columns", `Missing: ${missing.join(', ')}`)
    }
    await client.end()
  } catch (e) {
    fail('DB bookings schema check', e.message)
  }

  // Summary
  const total = passed + failed
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`RESULT: ${passed}/${total} passed`)
  console.log(`${'─'.repeat(60)}\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('Test runner error:', e); process.exit(1) })
