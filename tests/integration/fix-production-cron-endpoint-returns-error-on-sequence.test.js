/**
 * Tests for fix: Production cron endpoint returns error on sequences query
 * Task: d7930089-8eb9-4936-9372-ff229aeb1f33
 *
 * Root cause 1: The cron endpoint used nested PostgREST joins
 * (leads:lead_id(agents:agent_id(...))) which requires FK relationships
 * to be defined in the DB schema. The Supabase DB lacked these FKs,
 * causing PGRST200 "Could not find a relationship" → "Failed to fetch sequences".
 *
 * Root cause 2: The PostgREST QueryBuilder in db.ts called encodeURIComponent()
 * on filter values AND passed them to url.searchParams.set() which also encodes.
 * This double-encoding broke timestamp filters: ':' → '%3A' → '%253A'.
 * PostgreSQL received "%3A" literally and failed with "invalid input syntax for
 * type timestamp with time zone".
 *
 * Fix 1: Replace nested join with three flat, separate queries.
 * Fix 2: Remove encodeURIComponent() from filter value building in db.ts.
 */

const fs = require('fs')
const path = require('path')

const CRON_ROUTE_PATH = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/cron/follow-up/route.ts'
)

const DB_LIB_PATH = path.join(
  __dirname,
  '../product/lead-response/dashboard/lib/db.ts'
)

describe('fix-production-cron-endpoint-returns-error-on-sequence', () => {
  let routeSource
  let dbSource

  beforeAll(() => {
    routeSource = fs.readFileSync(CRON_ROUTE_PATH, 'utf-8')
    dbSource = fs.readFileSync(DB_LIB_PATH, 'utf-8')
  })

  test('cron route file exists', () => {
    expect(fs.existsSync(CRON_ROUTE_PATH)).toBe(true)
  })

  // --- Fix 1: Nested join removal ---

  test('does NOT use nested PostgREST join that requires FK relationships', () => {
    expect(routeSource).not.toMatch(/leads:lead_id\s*\(/m)
    expect(routeSource).not.toMatch(/agents:agent_id\s*\(/m)
  })

  test('queries lead_sequences with flat select (no joins)', () => {
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
    expect(routeSource).toMatch(/leadsMap/)
    expect(routeSource).toMatch(/agentsMap/)
  })

  test('returns detailed error message including error details', () => {
    expect(routeSource).toMatch(/details.*sequencesError\.message/)
  })

  test('hasReachedFrequencyCap no longer passes supabase as parameter', () => {
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

  // --- Fix 2: Double-encoding fix in db.ts ---

  test('db.ts does not use encodeURIComponent for lte filter values', () => {
    // Should be: url.searchParams.set(f.key, `lte.${f.val}`)
    // NOT: url.searchParams.set(f.key, `lte.${encodeURIComponent(f.val)}`)
    expect(dbSource).not.toMatch(/lte\.\$\{encodeURIComponent/)
  })

  test('db.ts does not use encodeURIComponent for gte filter values', () => {
    expect(dbSource).not.toMatch(/gte\.\$\{encodeURIComponent/)
  })

  test('db.ts does not use encodeURIComponent for eq filter values', () => {
    expect(dbSource).not.toMatch(/eq\.\$\{encodeURIComponent/)
  })

  test('db.ts does not use encodeURIComponent for lt filter values', () => {
    expect(dbSource).not.toMatch(/lt\.\$\{encodeURIComponent/)
  })

  test('db.ts passes raw filter values to searchParams (no double-encode)', () => {
    expect(dbSource).toMatch(/url\.searchParams\.set\(f\.key,\s*`lte\.\$\{f\.val\}`\)/)
    expect(dbSource).toMatch(/url\.searchParams\.set\(f\.key,\s*`gte\.\$\{f\.val\}`\)/)
  })
})
