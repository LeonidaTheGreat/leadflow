/**
 * QC E2E Test — db2d1a29-6902-4775-b33e-2792d33bcf7c
 * Task: fix-api-api-lead-capture-returns-500-db-schema-migrati
 *
 * Verifies:
 *   1. Migration SQL file 016 exists with correct columns
 *   2. Migration script exists and is executable
 *   3. route.ts upsert includes all required columns (first_name, status, utm_*)
 *   4. route.ts properly derives `name` to satisfy NOT NULL constraint
 *   5. ON CONFLICT deduplication is configured correctly
 *   6. No raw DB errors leaked to client
 *   7. lib/db.ts upsert header change doesn't remove Authorization header
 *
 * Run: node tests/e2e/db2d1a29-lead-capture-schema-migration.test.js
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

let passed = 0
let failed = 0

function test(label, fn) {
  try {
    fn()
    console.log(`  ✅ PASS: ${label}`)
    passed++
  } catch (err) {
    console.error(`  ❌ FAIL: ${label}`)
    console.error(`         ${err.message}`)
    failed++
  }
}

console.log('\n📋 QC: lead-capture DB schema migration (db2d1a29)\n')

// ── 1. Migration SQL file ───────────────────────────────────────────────────

const migrationPath = path.join(__dirname, '../../supabase/migrations/016_add_pilot_signups_lead_capture_columns.sql')
test('Migration file 016 exists', () => {
  assert.ok(fs.existsSync(migrationPath), 'supabase/migrations/016_add_pilot_signups_lead_capture_columns.sql not found')
})

const migrationSQL = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : ''

test('Migration adds first_name column', () => {
  assert.ok(migrationSQL.includes('first_name'), 'first_name column not in migration SQL')
})

test('Migration adds status column with default nurture', () => {
  assert.ok(migrationSQL.includes("status TEXT DEFAULT 'nurture'"), 'status column missing or wrong default')
})

test('Migration adds utm_source column', () => {
  assert.ok(migrationSQL.includes('utm_source'), 'utm_source column not in migration SQL')
})

test('Migration adds utm_medium column', () => {
  assert.ok(migrationSQL.includes('utm_medium'), 'utm_medium column not in migration SQL')
})

test('Migration uses IF NOT EXISTS (idempotent)', () => {
  assert.ok(
    migrationSQL.includes('ADD COLUMN IF NOT EXISTS'),
    'Migration must use IF NOT EXISTS for idempotency'
  )
})

test('Migration creates unique index on pilot_signups(email)', () => {
  assert.ok(
    migrationSQL.includes('CREATE UNIQUE INDEX') && migrationSQL.includes('pilot_signups(email)'),
    'Unique index on pilot_signups(email) missing from migration'
  )
})

// ── 2. Migration script exists ──────────────────────────────────────────────

const migScriptPath = path.join(__dirname, '../../scripts/db/migrate-pilot-signups-schema.js')
test('Migration script exists at scripts/db/migrate-pilot-signups-schema.js', () => {
  assert.ok(fs.existsSync(migScriptPath), 'scripts/db/migrate-pilot-signups-schema.js not found')
})

// ── 3. route.ts upsert includes all required columns ───────────────────────

const routePath = path.join(__dirname, '../../product/lead-response/dashboard/app/api/lead-capture/route.ts')
const routeSource = fs.existsSync(routePath) ? fs.readFileSync(routePath, 'utf8') : ''

test('route.ts exists', () => {
  assert.ok(fs.existsSync(routePath), 'route.ts not found at expected path')
})

test('route.ts upsert includes first_name', () => {
  assert.ok(routeSource.includes('first_name'), 'first_name missing from upsert payload in route.ts')
})

test('route.ts upsert includes status: nurture', () => {
  assert.ok(
    routeSource.includes("status: 'nurture'"),
    "status: 'nurture' missing from upsert payload"
  )
})

test('route.ts upsert includes utm_source', () => {
  assert.ok(routeSource.includes('utm_source'), 'utm_source missing from upsert payload')
})

test('route.ts upsert includes utm_medium', () => {
  assert.ok(routeSource.includes('utm_medium'), 'utm_medium missing from upsert payload')
})

test('route.ts upsert includes utm_campaign', () => {
  assert.ok(routeSource.includes('utm_campaign'), 'utm_campaign missing from upsert payload')
})

// ── 4. name derivation satisfies NOT NULL constraint ───────────────────────

test('route.ts derives name from firstName or email prefix', () => {
  assert.ok(
    routeSource.includes("firstName || email.split('@')[0]"),
    'Name derivation logic missing — pilot_signups.name has NOT NULL constraint'
  )
})

test('route.ts passes name field in upsert (satisfies NOT NULL)', () => {
  // Could be `name: nameValue` or `name,` shorthand depending on variable naming
  const hasName = routeSource.includes('name: nameValue') ||
    routeSource.includes('name: name') ||
    // shorthand property: variable named `name` in upsert object
    /upsert\s*\(\s*\{[^}]*\bname\b/s.test(routeSource)
  assert.ok(hasName, 'name field not found in upsert payload (pilot_signups.name is NOT NULL)')
})

// ── 5. Runtime logic: name derivation ──────────────────────────────────────

function deriveName(firstName, email) {
  return firstName || email.split('@')[0]
}

test('deriveName uses firstName when provided', () => {
  assert.strictEqual(deriveName('Sarah', 'sarah@realty.com'), 'Sarah')
})

test('deriveName falls back to email prefix when firstName is null', () => {
  assert.strictEqual(deriveName(null, 'agent.jones@brokerage.ca'), 'agent.jones')
})

test('deriveName never returns empty for valid email', () => {
  const result = deriveName(null, 'x@y.com')
  assert.ok(result && result.length > 0, `Expected non-empty result, got: ${JSON.stringify(result)}`)
})

// ── 6. No raw DB errors leaked to client ───────────────────────────────────

test('route.ts does not forward raw dbError to client', () => {
  const leakPattern = /NextResponse\.json\([^)]*error:\s*dbError/
  assert.ok(
    !leakPattern.test(routeSource),
    'dbError object must not be passed directly to NextResponse.json'
  )
})

test('route.ts returns sanitised 500 message on dbError', () => {
  assert.ok(
    routeSource.includes('Failed to save. Please try again.'),
    'Missing sanitised error message for DB failure'
  )
})

// ── 7. lib/db.ts Authorization header preserved ────────────────────────────

const dbTsPath = path.join(__dirname, '../../product/lead-response/dashboard/lib/db.ts')
const dbTsSource = fs.existsSync(dbTsPath) ? fs.readFileSync(dbTsPath, 'utf8') : ''

test('lib/db.ts still includes Authorization header in requests', () => {
  assert.ok(
    dbTsSource.includes("'Authorization'"),
    'Authorization header was accidentally removed from lib/db.ts'
  )
})

// ── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(60))
console.log(`📊 Results: ${passed} passed, ${failed} failed`)
console.log('─'.repeat(60))

if (failed > 0) {
  console.error('❌ Test suite FAILED\n')
  process.exit(1)
} else {
  console.log('✅ All tests PASSED\n')
  process.exit(0)
}
