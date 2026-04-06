/**
 * E2E Test: Personal outreach for verified signups
 * UC: fix-235-verified-signups-0-contacted-personally
 *
 * Acceptance Criteria:
 * - /admin/outreach page exists in build output
 * - outreach-candidates API returns email_verified agents (not just trial/pilot)
 * - outreach-candidates response includes contacted/contacted_at/invite_status fields
 * - outreach-candidates summary includes total_verified, contacted, uncontacted counts
 * - /api/admin/outreach-candidates returns 401 without auth
 * - /api/admin/invite-pilot returns 401 without X-Admin-Token
 * - outreach page source contains "Send Invite" functionality
 * - outreach page source filters by email_verified (not just plan_tier)
 */

const assert = require('assert')
const path = require('path')
const fs = require('fs')
const http = require('http')

const BASE_URL = process.env.DASHBOARD_URL || 'http://localhost:3000'

const results = { passed: 0, failed: 0, tests: [] }

function pass(name) {
  results.passed++
  results.tests.push({ name, status: '✅ PASS' })
  console.log(`✅ PASS: ${name}`)
}

function fail(name, reason) {
  results.failed++
  results.tests.push({ name, status: `❌ FAIL: ${reason}` })
  console.log(`❌ FAIL: ${name} — ${reason}`)
}

async function fetchUrl(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.pathname + (parsed.search || ''),
      method: opts.method || 'GET',
      headers: opts.headers || {},
    }
    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }))
    })
    req.on('error', reject)
    if (opts.body) req.write(opts.body)
    req.end()
  })
}

// ==================== BUILD OUTPUT CHECKS ====================

function testBuildOutputOutreachPageExists() {
  const pagePath = path.join(__dirname, '../.next/server/app/admin/outreach/page.js')
  if (fs.existsSync(pagePath)) {
    pass('Build output: /admin/outreach page exists')
  } else {
    fail('Build output: /admin/outreach page exists', `File not found: ${pagePath}`)
  }
}

function testBuildOutputOutreachApiExists() {
  const routePath = path.join(__dirname, '../.next/server/app/api/admin/outreach-candidates/route.js')
  if (fs.existsSync(routePath)) {
    pass('Build output: /api/admin/outreach-candidates route exists')
  } else {
    fail('Build output: /api/admin/outreach-candidates route exists', `File not found: ${routePath}`)
  }
}

function testOutreachPageContainsSendInvite() {
  const pagePath = path.join(__dirname, '../app/admin/outreach/page.tsx')
  if (!fs.existsSync(pagePath)) {
    fail('Outreach page source contains Send Invite', 'page.tsx not found')
    return
  }
  const src = fs.readFileSync(pagePath, 'utf-8')
  if (src.includes('sendInvite') && src.includes('invite-pilot')) {
    pass('Outreach page source contains Send Invite functionality')
  } else {
    fail('Outreach page source contains Send Invite functionality', 'sendInvite or invite-pilot not found in source')
  }
}

function testOutreachPageContactedStatus() {
  const pagePath = path.join(__dirname, '../app/admin/outreach/page.tsx')
  if (!fs.existsSync(pagePath)) {
    fail('Outreach page shows contacted status', 'page.tsx not found')
    return
  }
  const src = fs.readFileSync(pagePath, 'utf-8')
  if (src.includes('contacted') && src.includes('contacted_at')) {
    pass('Outreach page tracks contacted/contacted_at status')
  } else {
    fail('Outreach page tracks contacted/contacted_at status', 'contacted fields not found in source')
  }
}

function testOutreachApiQueriesEmailVerified() {
  const routePath = path.join(__dirname, '../app/api/admin/outreach-candidates/route.ts')
  if (!fs.existsSync(routePath)) {
    fail('Outreach API queries email_verified agents', 'route.ts not found')
    return
  }
  const src = fs.readFileSync(routePath, 'utf-8')
  if (src.includes('email_verified') && src.includes("eq('email_verified', true)")) {
    pass('Outreach API filters by email_verified=true (not just plan_tier)')
  } else {
    fail('Outreach API filters by email_verified=true', 'email_verified filter not found')
  }
}

function testOutreachApiIncludesContactedFields() {
  const routePath = path.join(__dirname, '../app/api/admin/outreach-candidates/route.ts')
  if (!fs.existsSync(routePath)) {
    fail('Outreach API includes contacted fields', 'route.ts not found')
    return
  }
  const src = fs.readFileSync(routePath, 'utf-8')
  const hasInviteCheck = src.includes('pilot_invites') && src.includes('contacted')
  const hasSummaryFields = src.includes('total_verified') && src.includes('uncontacted')
  if (hasInviteCheck && hasSummaryFields) {
    pass('Outreach API includes contacted status from pilot_invites + summary with total_verified/uncontacted')
  } else {
    fail('Outreach API includes contacted fields', `pilot_invites check: ${hasInviteCheck}, summary fields: ${hasSummaryFields}`)
  }
}

function testOutreachPagePriority10Section() {
  const pagePath = path.join(__dirname, '../app/admin/outreach/page.tsx')
  if (!fs.existsSync(pagePath)) {
    fail('Outreach page has Priority 10 section', 'page.tsx not found')
    return
  }
  const src = fs.readFileSync(pagePath, 'utf-8')
  if (src.includes('top10Uncontacted') && src.includes('Priority 10')) {
    pass('Outreach page has Priority 10 uncontacted leads section')
  } else {
    fail('Outreach page has Priority 10 uncontacted leads section', 'top10Uncontacted or Priority 10 not found')
  }
}

// ==================== HTTP CHECKS ====================

async function testOutreachCandidatesRequiresAuth() {
  try {
    const res = await fetchUrl(`${BASE_URL}/api/admin/outreach-candidates`)
    if (res.status === 401) {
      pass('GET /api/admin/outreach-candidates returns 401 without auth')
    } else {
      fail('GET /api/admin/outreach-candidates returns 401 without auth', `Got HTTP ${res.status}`)
    }
  } catch (e) {
    fail('GET /api/admin/outreach-candidates returns 401 without auth', `Request failed: ${e.message}`)
  }
}

async function testInvitePilotRequiresAdminToken() {
  try {
    const res = await fetchUrl(`${BASE_URL}/api/admin/invite-pilot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', name: 'Test' }),
    })
    if (res.status === 401) {
      pass('POST /api/admin/invite-pilot returns 401 without X-Admin-Token')
    } else {
      fail('POST /api/admin/invite-pilot returns 401 without X-Admin-Token', `Got HTTP ${res.status}`)
    }
  } catch (e) {
    fail('POST /api/admin/invite-pilot returns 401 without X-Admin-Token', `Request failed: ${e.message}`)
  }
}

// ==================== RUN ====================

async function run() {
  console.log('\n=== Outreach: 235 verified signups, 0 contacted personally ===\n')

  // Build output / source checks (always run)
  testBuildOutputOutreachPageExists()
  testBuildOutputOutreachApiExists()
  testOutreachPageContainsSendInvite()
  testOutreachPageContactedStatus()
  testOutreachApiQueriesEmailVerified()
  testOutreachApiIncludesContactedFields()
  testOutreachPagePriority10Section()

  // HTTP checks (run if Next.js dashboard server is up)
  try {
    const healthRes = await fetchUrl(`${BASE_URL}/api/health`)
    // Only run HTTP tests if this is the Next.js dashboard (returns JSON with db key)
    let isNextJsDashboard = false
    try {
      const health = JSON.parse(healthRes.body)
      isNextJsDashboard = 'db' in health || 'env' in health || healthRes.status === 200
    } catch {
      isNextJsDashboard = false
    }

    if (isNextJsDashboard) {
      await testOutreachCandidatesRequiresAuth()
      await testInvitePilotRequiresAdminToken()
    } else {
      console.log('⚠️  Next.js dashboard not running — skipping HTTP checks')
    }
  } catch {
    console.log('⚠️  Server not running — skipping HTTP checks')
  }

  console.log(`\n=== Results: ${results.passed} passed, ${results.failed} failed ===\n`)

  if (results.failed > 0) {
    process.exit(1)
  }
}

run().catch((e) => {
  console.error('Test runner error:', e)
  process.exit(1)
})
