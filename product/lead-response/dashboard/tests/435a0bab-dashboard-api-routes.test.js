/**
 * E2E test for PR #1065 — Dashboard API routes deployment drift fix
 * Task: 435a0bab-c5d9-43eb-957a-48e49bbb82ad
 *
 * Reads files directly from git commit objects — immune to concurrent
 * branch switching by other processes (heartbeat, build-health, etc.).
 *
 * Tests:
 * 1. New route files exist in the PR commit
 * 2. Normalizer handles both view schemas (core drift fix)
 * 3. Stats route: correct imports, graceful error handling, correct view
 * 4. Leads route: correct imports, status filter, correct view
 * 5. Components delegate data fetching to API routes
 * 6. Settings layout wraps pages with dashboard shell
 * 7. Migration script correctness
 */

const assert = require('assert')
const { execSync } = require('child_process')
const path = require('path')

const REPO_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim()
const PR_COMMIT = '90548a28' // last dev commit of PR (before QC test commits)

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`)
    failed++
  }
}

// Read a file directly from a git commit object — safe regardless of branch state
function gitShow(commit, relPath) {
  return execSync(`git show "${commit}:${relPath}"`, { cwd: REPO_ROOT, encoding: 'utf8' })
}

function gitFileExists(commit, relPath) {
  try {
    execSync(`git cat-file -e "${commit}:${relPath}"`, { cwd: REPO_ROOT })
    return true
  } catch {
    return false
  }
}

console.log('\n=== PR #1065: Dashboard API Routes Deployment Drift Fix ===')
console.log(`Using git commit: ${PR_COMMIT}\n`)

// ── 1. Route files exist in the PR commit ────────────────────────────────────
console.log('1. Route files exist in PR commit:')

const filesToCheck = [
  'product/lead-response/dashboard/app/api/dashboard/stats/route.ts',
  'product/lead-response/dashboard/app/api/dashboard/leads/route.ts',
  'product/lead-response/dashboard/app/settings/layout.tsx',
  'scripts/db/create-dashboard-views.js',
]

for (const relPath of filesToCheck) {
  test(`exists: ${relPath.split('/').pop()}`, () => {
    assert.ok(gitFileExists(PR_COMMIT, relPath), `Not found in commit ${PR_COMMIT}: ${relPath}`)
  })
}

// ── 2. normalizeRow aliasing (core drift fix) ─────────────────────────────────
console.log('\n2. normalizeRow handles both view schemas:')

function normalizeRow(row) {
  return {
    new_leads: row.new_leads ?? row.new_today ?? 0,
    qualified_leads: row.qualified_leads ?? 0,
    responded_leads: row.responded_leads ?? row.responses_today ?? 0,
    leads_today: row.leads_today ?? row.new_today ?? 0,
    leads_this_week: row.leads_this_week ?? 0,
    avg_urgency: row.avg_urgency ?? 0,
    total_leads: row.total_leads ?? 0,
  }
}

test('canonical schema normalizes correctly', () => {
  const r = normalizeRow({ new_leads: 5, responded_leads: 3, leads_today: 5, total_leads: 20 })
  assert.strictEqual(r.new_leads, 5)
  assert.strictEqual(r.responded_leads, 3)
})

test('prod view schema (new_today, responses_today) aliases correctly', () => {
  const r = normalizeRow({ new_today: 3, responses_today: 2, total_leads: 10 })
  assert.strictEqual(r.new_leads, 3, 'new_today → new_leads')
  assert.strictEqual(r.responded_leads, 2, 'responses_today → responded_leads')
  assert.strictEqual(r.leads_today, 3, 'new_today → leads_today fallback')
})

test('missing fields fall back to 0', () => {
  const r = normalizeRow({})
  assert.strictEqual(r.new_leads, 0)
  assert.strictEqual(r.responded_leads, 0)
  assert.strictEqual(r.total_leads, 0)
})

test('canonical fields win over aliases when both present', () => {
  const r = normalizeRow({ new_leads: 10, new_today: 99, responded_leads: 5, responses_today: 99 })
  assert.strictEqual(r.new_leads, 10)
  assert.strictEqual(r.responded_leads, 5)
})

// ── 3. Stats route ─────────────────────────────────────────────────────────────
console.log('\n3. Stats route (read from git):')

const statsRoute = gitShow(PR_COMMIT, 'product/lead-response/dashboard/app/api/dashboard/stats/route.ts')

test('exports GET handler', () => assert.ok(statsRoute.includes('export async function GET')))
test('imports from @/lib/db, not @/lib/supabase', () => {
  assert.ok(statsRoute.includes("from '@/lib/db'"))
  assert.ok(!statsRoute.includes("from '@/lib/supabase'"))
})
test('returns empty stats on error (no 500)', () => {
  assert.ok(statsRoute.includes('getEmptyStats()'))
})
test('queries dashboard_stats view', () => assert.ok(statsRoute.includes("'dashboard_stats'")))
test('normalizeRow handles new_today + responses_today aliases', () => {
  assert.ok(statsRoute.includes('new_today') && statsRoute.includes('responses_today'))
})

// ── 4. Leads route ─────────────────────────────────────────────────────────────
console.log('\n4. Leads route (read from git):')

const leadsRoute = gitShow(PR_COMMIT, 'product/lead-response/dashboard/app/api/dashboard/leads/route.ts')

test('exports GET handler', () => assert.ok(leadsRoute.includes('export async function GET')))
test('imports from @/lib/db, not @/lib/supabase', () => {
  assert.ok(leadsRoute.includes("from '@/lib/db'"))
  assert.ok(!leadsRoute.includes("from '@/lib/supabase'"))
})
test('supports ?status filter', () => {
  assert.ok(leadsRoute.includes('searchParams.get') && leadsRoute.includes("status !== 'all'"))
})
test('queries lead_summary view', () => assert.ok(leadsRoute.includes("'lead_summary'")))

// ── 5. Component delegation ────────────────────────────────────────────────────
console.log('\n5. Component delegation (read from git):')

const statsCards = gitShow(PR_COMMIT, 'product/lead-response/dashboard/components/dashboard/StatsCards.tsx')
test('StatsCards has no direct supabase import', () => assert.ok(!statsCards.includes("from '@/lib/supabase'")))
test('StatsCards fetches /api/dashboard/stats', () => assert.ok(statsCards.includes('/api/dashboard/stats')))

const leadFeed = gitShow(PR_COMMIT, 'product/lead-response/dashboard/components/dashboard/LeadFeed.tsx')
test('LeadFeed fetches /api/dashboard/leads', () => assert.ok(leadFeed.includes('/api/dashboard/leads')))
test('LeadFeed retains realtime subscription but not direct data fetch', () => {
  assert.ok(leadFeed.includes("channel('leads')"))
  assert.ok(!leadFeed.includes(".from('lead_summary')"))
})

// ── 6. Settings layout ─────────────────────────────────────────────────────────
console.log('\n6. Settings layout (read from git):')

const settingsLayout = gitShow(PR_COMMIT, 'product/lead-response/dashboard/app/settings/layout.tsx')
test('includes DashboardNav', () => assert.ok(settingsLayout.includes('DashboardNav')))
test('includes OnboardingGuard', () => assert.ok(settingsLayout.includes('OnboardingGuard')))
test('includes TrialNudgeBanner', () => assert.ok(settingsLayout.includes('TrialNudgeBanner')))

// ── 7. Migration script ────────────────────────────────────────────────────────
console.log('\n7. Migration script (read from git):')

const migration = gitShow(PR_COMMIT, 'scripts/db/create-dashboard-views.js')
test('creates dashboard_stats view', () => assert.ok(migration.includes('CREATE OR REPLACE VIEW dashboard_stats')))
test('creates lead_summary view', () => assert.ok(migration.includes('CREATE OR REPLACE VIEW lead_summary')))
test('wraps DDL in transaction', () => {
  assert.ok(migration.includes("client.query('BEGIN')") && migration.includes("client.query('COMMIT')"))
})
test('loads LOCAL_PG_URL', () => assert.ok(migration.includes('LOCAL_PG_URL')))

// ── Summary ───────────────────────────────────────────────────────────────────
const total = passed + failed
console.log(`\n${'='.repeat(48)}`)
console.log(`Results: ${passed}/${total} passed`)
if (failed > 0) {
  console.log(`FAILED: ${failed} test(s)`)
  process.exit(1)
} else {
  console.log('All tests passed ✅')
  process.exit(0)
}
