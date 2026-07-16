/**
 * E2E test for PR #1875: Admin Email Verification Override
 * Use case: uc-admin-email-verify-override
 *
 * Static source analysis + structural checks for the new admin route and page.
 * Verifies: auth guard wiring, parameterized queries, input validation, import resolution.
 *
 * Run: node tests/e2e/pr-1875-admin-email-verify-override.test.js
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD = path.join(__dirname, '../../product/lead-response/dashboard')
const ROUTE = path.join(DASHBOARD, 'app/api/admin/verify-email/route.ts')
const PAGE = path.join(DASHBOARD, 'app/admin/email-verification/page.tsx')

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

console.log('\n=== E2E: Admin Email Verification Override (PR #1875) ===\n')

// ── File existence ─────────────────────────────────────────────────────────────

test('API route file exists', () => {
  assert.ok(fs.existsSync(ROUTE), `Missing: ${ROUTE}`)
})

test('Admin page file exists', () => {
  assert.ok(fs.existsSync(PAGE), `Missing: ${PAGE}`)
})

// ── Route source checks ────────────────────────────────────────────────────────

const routeSrc = fs.existsSync(ROUTE) ? fs.readFileSync(ROUTE, 'utf8') : ''
const pageSrcFromFile = fs.existsSync(PAGE) ? fs.readFileSync(PAGE, 'utf8') : ''

test('Route imports requireAdmin from AuthService', () => {
  assert.ok(
    routeSrc.includes("from '@/lib/services/AuthService'") && routeSrc.includes('requireAdmin'),
    'requireAdmin must be imported from AuthService'
  )
})

test('Route imports postgrestAdmin from db', () => {
  assert.ok(
    routeSrc.includes("from '@/lib/db'") && routeSrc.includes('postgrestAdmin'),
    'postgrestAdmin must be imported from @/lib/db'
  )
})

test('GET handler calls requireAdmin before querying DB', () => {
  const getMatch = routeSrc.match(/export async function GET[\s\S]*?(?=export async function POST|$)/)
  const getBlock = getMatch ? getMatch[0] : ''
  const authIdx = getBlock.indexOf('requireAdmin')
  const dbIdx = getBlock.indexOf('postgrestAdmin')
  assert.ok(authIdx !== -1, 'GET must call requireAdmin')
  assert.ok(dbIdx !== -1, 'GET must query postgrestAdmin')
  assert.ok(authIdx < dbIdx, 'requireAdmin must be called BEFORE postgrestAdmin in GET')
})

test('POST handler calls requireAdmin before querying DB', () => {
  const postMatch = routeSrc.match(/export async function POST[\s\S]*$/)
  const postBlock = postMatch ? postMatch[0] : ''
  const authIdx = postBlock.indexOf('requireAdmin')
  const dbIdx = postBlock.indexOf('postgrestAdmin')
  assert.ok(authIdx !== -1, 'POST must call requireAdmin')
  assert.ok(dbIdx !== -1, 'POST must query postgrestAdmin')
  assert.ok(authIdx < dbIdx, 'requireAdmin must be called BEFORE postgrestAdmin in POST')
})

test('Route returns 401 on auth failure', () => {
  assert.ok(routeSrc.includes('status: 401'), 'Route must return 401 for unauthorized access')
})

test('Route validates POST body: rejects missing agentId and all=true', () => {
  assert.ok(
    routeSrc.includes('agentId or all required') || routeSrc.includes("'agentId or all required'"),
    'POST must validate that agentId or all is present'
  )
  assert.ok(routeSrc.includes('status: 400'), 'Route must return 400 for bad input')
})

test('POST uses parameterized .eq() calls — no string interpolation into query', () => {
  // Check that agentId is passed via .eq() not string concatenation
  assert.ok(
    routeSrc.includes('.eq(\'id\', agentId)') || routeSrc.includes('.eq("id", agentId)'),
    'agentId must be passed via parameterized .eq() call, not interpolated'
  )
})

test('Route targets real_estate_agents table', () => {
  assert.ok(
    routeSrc.includes("'real_estate_agents'"),
    "Route must query 'real_estate_agents' table"
  )
})

test('Route updates email_verified column', () => {
  assert.ok(
    routeSrc.includes('email_verified'),
    'Route must update the email_verified column'
  )
})

// ── Page source checks ─────────────────────────────────────────────────────────

const pageSrc = pageSrcFromFile

test('Page has use client directive', () => {
  assert.ok(pageSrc.startsWith("'use client'"), "Page must have 'use client' directive")
})

test('Page calls /api/admin/verify-email endpoint', () => {
  assert.ok(
    pageSrc.includes('/api/admin/verify-email'),
    'Page must call /api/admin/verify-email'
  )
})

test('Page handles 401 by redirecting to admin login', () => {
  assert.ok(
    pageSrc.includes('/admin/login'),
    'Page must redirect to /admin/login on 401'
  )
})

test('Page has verify-all button with testid', () => {
  assert.ok(
    pageSrc.includes('data-testid="verify-all-btn"'),
    'Page must have verify-all-btn testid for testing'
  )
})

test('Page has per-row verify button with testid', () => {
  assert.ok(
    pageSrc.includes('data-testid={`verify-btn-${agent.id}`}') ||
    pageSrc.includes("data-testid={`verify-btn-${agent.id}`}"),
    'Page must have per-row verify-btn testid'
  )
})

// ── Summary ────────────────────────────────────────────────────────────────────

console.log(`\n  Passed: ${passed} / ${passed + failed}\n`)
if (failed > 0) process.exit(1)
