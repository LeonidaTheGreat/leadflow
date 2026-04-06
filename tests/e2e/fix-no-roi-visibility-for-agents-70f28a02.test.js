/**
 * QC E2E Test: ROI Metrics Widget - No ROI Visibility for Agents
 * Task: 70f28a02-f04b-439b-9ea2-45623be2c491
 * UC: fix-no-roi-visibility-for-agents
 *
 * Acceptance Criteria:
 * - Agents can see ROI metrics (leads responded, appointments booked, response time)
 * - The ROI widget renders in the dashboard
 * - The API returns the correct shape with all required fields
 * - Existing functionality is not broken
 *
 * Tests:
 * 1. ROI widget component file exists
 * 2. Widget is imported and used in dashboard page
 * 3. API route file exists at /api/metrics/roi
 * 4. API route returns leadsResponded field
 * 5. API route returns appointmentsBookedThisMonth field
 * 6. API route returns avgResponseTimeSeconds field
 * 7. API uses correct 'bookings' table (not deleted calcom_bookings)
 * 8. Response time fix: sms_messages query replaces broken join
 * 9. Auth guard: agent_id from session only (not query params)
 * 10. Widget renders all three core metrics in JSX
 * 11. bookings table exists in database
 * 12. leads table has agent_id + status columns for ROI query
 * 13. sms_messages table has lead_id + direction + created_at columns
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const DASHBOARD_BASE = path.resolve(__dirname, '../../product/lead-response/dashboard')

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
  console.log('\n=== QC E2E: ROI Metrics Widget (fix-no-roi-visibility-for-agents) ===\n')

  // ── 1. ROI widget component exists ────────────────────────────────────────
  const widgetPath = path.join(DASHBOARD_BASE, 'components/dashboard/RoiMetricsWidget.tsx')
  if (fs.existsSync(widgetPath)) {
    pass('RoiMetricsWidget.tsx component file exists')
  } else {
    fail('RoiMetricsWidget.tsx component file exists', `Not found at ${widgetPath}`)
  }

  // ── 2. Widget wired into dashboard page ───────────────────────────────────
  const dashboardPagePath = path.join(DASHBOARD_BASE, 'app/dashboard/page.tsx')
  if (fs.existsSync(dashboardPagePath)) {
    const dashboardContent = fs.readFileSync(dashboardPagePath, 'utf8')
    if (dashboardContent.includes('RoiMetricsWidget') && dashboardContent.includes('import')) {
      pass('RoiMetricsWidget is imported and used in dashboard page')
    } else {
      fail('RoiMetricsWidget is imported and used in dashboard page', 'Widget not found in dashboard page.tsx')
    }
  } else {
    fail('RoiMetricsWidget is imported and used in dashboard page', 'Dashboard page not found')
  }

  // ── 3. API route exists ───────────────────────────────────────────────────
  const routePath = path.join(DASHBOARD_BASE, 'app/api/metrics/roi/route.ts')
  if (fs.existsSync(routePath)) {
    pass('/api/metrics/roi route.ts file exists')
  } else {
    fail('/api/metrics/roi route.ts file exists', `Not found at ${routePath}`)
    // Cannot do further route checks
    console.log('\n[ABORT] Route file missing — skipping route content checks\n')
    return RESULTS
  }

  const routeContent = fs.readFileSync(routePath, 'utf8')

  // ── 4. API returns leadsResponded ─────────────────────────────────────────
  if (routeContent.includes('leadsResponded')) {
    pass('API route includes leadsResponded metric')
  } else {
    fail('API route includes leadsResponded metric', 'leadsResponded not found in route.ts')
  }

  // ── 5. API returns appointmentsBookedThisMonth ────────────────────────────
  if (routeContent.includes('appointmentsBookedThisMonth')) {
    pass('API route includes appointmentsBookedThisMonth metric')
  } else {
    fail('API route includes appointmentsBookedThisMonth metric', 'appointmentsBookedThisMonth not found in route.ts')
  }

  // ── 6. API returns avgResponseTimeSeconds ─────────────────────────────────
  if (routeContent.includes('avgResponseTimeSeconds')) {
    pass('API route includes avgResponseTimeSeconds metric')
  } else {
    fail('API route includes avgResponseTimeSeconds metric', 'avgResponseTimeSeconds not found in route.ts')
  }

  // ── 7. Uses 'bookings' table (not deleted calcom_bookings) ────────────────
  const usesBookings = routeContent.includes(".from('bookings')")
  const usesCalcom = routeContent.includes("calcom_bookings")
  if (usesBookings && !usesCalcom) {
    pass("API uses 'bookings' table (not deleted calcom_bookings)")
  } else if (usesCalcom) {
    fail("API uses 'bookings' table (not deleted calcom_bookings)", "Still references calcom_bookings which does not exist")
  } else {
    fail("API uses 'bookings' table (not deleted calcom_bookings)", "Cannot find bookings table reference in route")
  }

  // ── 8. Response time uses sms_messages direct query (fix for broken join) ─
  const usesSmsMessages = routeContent.includes(".from('sms_messages')")
  const hasOldJoin = routeContent.includes("sms_messages!inner")
  if (usesSmsMessages && !hasOldJoin) {
    pass('Response time uses sms_messages direct query (broken join fixed)')
  } else if (hasOldJoin) {
    fail('Response time uses sms_messages direct query', 'Still uses old sms_messages!inner join which was broken')
  } else {
    fail('Response time uses sms_messages direct query', 'sms_messages query not found in route')
  }

  // ── 9. Auth guard: agent_id from session only ─────────────────────────────
  const hasAuthCheck = routeContent.includes('getAuthUserId') && routeContent.includes('Unauthorized')
  const hasQueryParamId = routeContent.includes('searchParams') && routeContent.includes('agent_id')
  if (hasAuthCheck && !hasQueryParamId) {
    pass('Auth guard: agentId from session only (not query params)')
  } else if (!hasAuthCheck) {
    fail('Auth guard: agentId from session only', 'Missing getAuthUserId or Unauthorized response')
  } else {
    fail('Auth guard: agentId from session only', 'Route accepts agent_id from query params — security risk')
  }

  // ── 10. Widget renders all three core metrics ─────────────────────────────
  const widgetContent = fs.readFileSync(widgetPath, 'utf8')
  const hasLeadsRendered = widgetContent.includes('leadsResponded') && widgetContent.includes('Leads Responded')
  const hasApptsRendered = widgetContent.includes('appointmentsBookedThisMonth') && widgetContent.includes('Appointments Booked')
  const hasResponseRendered = widgetContent.includes('avgResponseTimeSeconds') && widgetContent.includes('Avg Response Time')

  if (hasLeadsRendered) {
    pass('Widget renders leadsResponded metric in JSX')
  } else {
    fail('Widget renders leadsResponded metric in JSX', 'leadsResponded or "Leads Responded" label missing in widget')
  }

  if (hasApptsRendered) {
    pass('Widget renders appointmentsBookedThisMonth metric in JSX')
  } else {
    fail('Widget renders appointmentsBookedThisMonth metric in JSX', 'appointmentsBookedThisMonth or "Appointments Booked" label missing')
  }

  if (hasResponseRendered) {
    pass('Widget renders avgResponseTimeSeconds metric in JSX')
  } else {
    fail('Widget renders avgResponseTimeSeconds metric in JSX', 'avgResponseTimeSeconds or "Avg Response Time" label missing')
  }

  // ── DB Schema checks ──────────────────────────────────────────────────────
  let client
  try {
    client = new Client({ connectionString: 'postgresql://clawdbot@localhost/openclaw' })
    await client.connect()

    // 11. bookings table exists
    try {
      const res = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'bookings'
        ORDER BY column_name
      `)
      if (res.rows.length > 0) {
        pass("'bookings' table exists in database")
      } else {
        fail("'bookings' table exists in database", "Table has no columns or does not exist")
      }
    } catch (e) {
      fail("'bookings' table exists in database", e.message)
    }

    // 12. leads table has agent_id + status columns
    try {
      const res = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name IN ('agent_id', 'status', 'created_at')
      `)
      const cols = res.rows.map(r => r.column_name)
      const missing = ['agent_id', 'status', 'created_at'].filter(c => !cols.includes(c))
      if (missing.length === 0) {
        pass("leads table has agent_id, status, created_at columns for ROI query")
      } else {
        fail("leads table has required columns for ROI query", `Missing: ${missing.join(', ')}`)
      }
    } catch (e) {
      fail("leads table has required columns", e.message)
    }

    // 13. sms_messages table has lead_id + direction + created_at
    try {
      const res = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'sms_messages' AND column_name IN ('lead_id', 'direction', 'created_at')
      `)
      const cols = res.rows.map(r => r.column_name)
      const missing = ['lead_id', 'direction', 'created_at'].filter(c => !cols.includes(c))
      if (missing.length === 0) {
        pass("sms_messages table has lead_id, direction, created_at for response time calculation")
      } else {
        fail("sms_messages table has required columns", `Missing: ${missing.join(', ')}`)
      }
    } catch (e) {
      fail("sms_messages table has required columns", e.message)
    }

    await client.end()
  } catch (connErr) {
    fail('Database connection', connErr.message)
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  const total = RESULTS.passed + RESULTS.failed
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`RESULT: ${RESULTS.passed}/${total} passed`)
  console.log(`${'─'.repeat(60)}`)
  if (RESULTS.failed > 0) {
    console.log('\nFAILED CHECKS:')
    RESULTS.details.filter(d => d.status === 'FAIL').forEach(d => {
      console.log(`  - ${d.name}: ${d.reason}`)
    })
  } else {
    console.log('\nAll checks passed. ROI visibility AC met.')
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
