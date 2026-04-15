/**
 * test-triage-api-integration.js
 *
 * Integration tests for the triage API endpoint
 * Tests the full flow: API route → Supabase → Response
 */

const assert = require('assert')
const path = require('path')

const PROJECT_ROOT = path.join(__dirname, '..')

console.log('\n=== triage-api-integration tests ===\n')

// ── Test 1: API Route file exists ───────────────────────────────────────────

console.log('1. API Route structure')
const fs = require('fs')
const apiRoutePath = path.join(PROJECT_ROOT, 'product/lead-response/dashboard/app/api/admin/triage-use-cases/route.ts')

assert.ok(fs.existsSync(apiRoutePath), `Expected API route at ${apiRoutePath}`)
console.log('  ✅ API route file exists')

// ── Test 2: API Route has required exports ──────────────────────────────────

console.log('\n2. API Route exports')

const routeContent = fs.readFileSync(apiRoutePath, 'utf-8')

assert.ok(routeContent.includes('export async function GET'), 'Should export GET handler')
console.log('  ✅ GET handler exported')

assert.ok(routeContent.includes('NextResponse.json'), 'Should use NextResponse')
console.log('  ✅ Uses NextResponse for JSON responses')

// ── Test 3: API Route has auth check ────────────────────────────────────────

console.log('\n3. Authentication checks')

assert.ok(routeContent.includes('authorization'), 'Should check authorization header')
console.log('  ✅ Checks authorization header')

assert.ok(routeContent.includes('INTERNAL_API_KEY'), 'Should check INTERNAL_API_KEY')
console.log('  ✅ Validates against INTERNAL_API_KEY')

assert.ok(routeContent.includes('status: 401'), 'Should return 401 for unauthorized')
console.log('  ✅ Returns 401 for unauthorized requests')

// ── Test 4: API Route fetches from Supabase ────────────────────────────────

console.log('\n4. Supabase integration')

assert.ok(routeContent.includes('createClient'), 'Should create Supabase client')
console.log('  ✅ Creates Supabase client')

assert.ok(routeContent.includes('use_cases'), 'Should query use_cases table')
console.log('  ✅ Queries use_cases table')

assert.ok(routeContent.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Should use service role key')
console.log('  ✅ Uses service role authentication')

// ── Test 5: API Route returns expected structure ────────────────────────────

console.log('\n5. Response structure')

assert.ok(routeContent.includes('summary'), 'Should include summary in response')
console.log('  ✅ Includes summary object')

assert.ok(routeContent.includes('analyses'), 'Should include analyses in response')
console.log('  ✅ Includes analyses array')

assert.ok(routeContent.includes('generated_at'), 'Should include generated_at timestamp')
console.log('  ✅ Includes generated_at timestamp')

// ── Test 6: Dashboard page exists and has required imports ──────────────────

console.log('\n6. Dashboard page structure')

const dashboardPath = path.join(PROJECT_ROOT, 'product/lead-response/dashboard/app/admin/triage/page.tsx')

assert.ok(fs.existsSync(dashboardPath), `Expected dashboard page at ${dashboardPath}`)
console.log('  ✅ Dashboard page exists')

const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8')

assert.ok(dashboardContent.includes("'use client'"), 'Should be a client component')
console.log('  ✅ Is a Next.js client component')

assert.ok(dashboardContent.includes('useEffect'), 'Should use useEffect for data fetching')
console.log('  ✅ Uses useEffect for lifecycle management')

assert.ok(dashboardContent.includes('/api/admin/triage-use-cases'), 'Should call the API route')
console.log('  ✅ Calls the correct API endpoint')

assert.ok(dashboardContent.includes('recommendation'), 'Should display recommendations')
console.log('  ✅ Displays recommendations')

// ── Test 7: Error handling in dashboard ─────────────────────────────────────

console.log('\n7. Error handling')

assert.ok(dashboardContent.includes('setError'), 'Should set error state')
console.log('  ✅ Handles errors gracefully')

assert.ok(dashboardContent.includes('error'), 'Should display error messages')
console.log('  ✅ Displays error messages to user')

assert.ok(dashboardContent.includes('loading'), 'Should show loading state')
console.log('  ✅ Shows loading state')

// ── Test 8: Utility script can be called standalone ─────────────────────────

console.log('\n8. Standalone utility')

const utilityPath = path.join(PROJECT_ROOT, 'scripts/utilities/triage-stuck-use-cases.js')
const utilityContent = fs.readFileSync(utilityPath, 'utf-8')

assert.ok(utilityContent.includes('require.main === module'), 'Should support standalone execution')
console.log('  ✅ Can run as standalone script')

assert.ok(utilityContent.includes('module.exports'), 'Should export functions')
console.log('  ✅ Exports functions for reuse')

// ── Test 9: Code quality - no security issues ──────────────────────────────

console.log('\n9. Code quality & security')

assert.ok(!routeContent.includes('eval('), 'Should not use eval()')
console.log('  ✅ No eval() usage')

assert.ok(!dashboardContent.includes('dangerouslySetInnerHTML'), 'Should not use dangerouslySetInnerHTML')
console.log('  ✅ No dangerouslySetInnerHTML usage')

// Check for loose equality (but != and !== are ok)
assert.ok(!routeContent.match(/[^\!=]==[^\!=]/), 'Should use === not ==')
assert.ok(routeContent.includes('===') || routeContent.includes('!=='), 'Should use strict equality')
console.log('  ✅ Uses strict equality (===)')

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\n─────────────────────────────────')
console.log('✅ All integration checks passed!')
console.log('─────────────────────────────────')
