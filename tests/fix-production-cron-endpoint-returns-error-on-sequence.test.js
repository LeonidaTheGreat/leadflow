/**
 * Tests for fix: Production cron endpoint returns error on sequences query
 * Task: d7930089-8eb9-4936-9372-ff229aeb1f33
 *
 * Root cause: The cron endpoint used nested PostgREST joins
 * (leads:lead_id(agents:agent_id(...))) which requires FK relationships
 * to be defined in the DB schema. The Supabase DB lacked these FKs,
 * causing the query to fail with "Failed to fetch sequences".
 *
 * Fix: Replaced nested join with three separate flat queries:
 *   1. lead_sequences (flat)
 *   2. leads (by id, flat)
 *   3. agents (by id, flat)
 * Then assembles the enriched data in-memory.
 */

const fs = require('fs')
const path = require('path')

const CRON_ROUTE_PATH = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/cron/follow-up/route.ts'
)

describe('fix-production-cron-endpoint-returns-error-on-sequence', () => {
  let routeSource

  beforeAll(() => {
    routeSource = fs.readFileSync(CRON_ROUTE_PATH, 'utf-8')
  })

  test('cron route file exists', () => {
    expect(fs.existsSync(CRON_ROUTE_PATH)).toBe(true)
  })

  test('does NOT use nested PostgREST join that requires FK relationships', () => {
    // The old broken pattern: .select(`*, leads:lead_id (... agents:agent_id (...))`)
    expect(routeSource).not.toMatch(/leads:lead_id\s*\(/m)
    expect(routeSource).not.toMatch(/agents:agent_id\s*\(/m)
  })

  test('queries lead_sequences with flat select (no joins)', () => {
    // Must query lead_sequences with just '*' or flat columns
    expect(routeSource).toMatch(/\.from\(['"]lead_sequences['"]\)\s*\n?\s*\.select\(['"]?\*['"]?\)/)
  })

  test('queries leads table separately using .in() filter', () => {
    expect(routeSource).toMatch(/\.from\(['"]leads['"]\)/)
    expect(routeSource).toMatch(/\.in\(/)
  })

  test('queries agents table separately using .in() filter', () => {
    expect(routeSource).toMatch(/\.from\(['"]agents['"]\)/)
  })

  test('assembles enriched data in-memory via map lookups', () => {
    // Should have map objects for leads and agents
    expect(routeSource).toMatch(/leadsMap/)
    expect(routeSource).toMatch(/agentsMap/)
  })

  test('returns detailed error message including error details', () => {
    // Error response should include details field for better debugging
    expect(routeSource).toMatch(/details.*sequencesError\.message/)
  })

  test('hasReachedFrequencyCap no longer passes supabase as parameter', () => {
    // Old version: hasReachedFrequencyCap(leadId, supabase)
    // New version: hasReachedFrequencyCap(leadId)
    expect(routeSource).not.toMatch(/hasReachedFrequencyCap\(lead\.id,\s*supabase\)/)
    expect(routeSource).toMatch(/hasReachedFrequencyCap\(lead\.id\)/)
  })

  test('cron route exports GET handler', () => {
    expect(routeSource).toMatch(/export\s+async\s+function\s+GET/)
  })

  test('still includes TCPA compliance footer', () => {
    expect(routeSource).toMatch(/SMS_COMPLIANCE_FOOTER/)
    expect(routeSource).toMatch(/Reply STOP to opt out/)
  })

  test('still enforces quiet hours check', () => {
    expect(routeSource).toMatch(/isQuietHours/)
  })

  test('still enforces frequency cap', () => {
    expect(routeSource).toMatch(/MAX_MESSAGES_PER_LEAD_PER_DAY/)
    expect(routeSource).toMatch(/hasReachedFrequencyCap/)
  })

  test('still handles dry-run mode', () => {
    expect(routeSource).toMatch(/isDryRun/)
    expect(routeSource).toMatch(/DRY-RUN/)
  })
})
