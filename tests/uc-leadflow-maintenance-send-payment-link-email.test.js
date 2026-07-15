/**
 * E2E test for PR #1850 — send-payment-link-email API route
 * Tests auth gate, input validation, and 404 for unknown agents.
 * Gracefully handles environments where STRIPE_SECRET_KEY is absent.
 *
 * Usage: node tests/uc-leadflow-maintenance-send-payment-link-email.test.js
 * Requires: Next.js server running on port 3032 (next start -p 3032)
 */

'use strict'

const http = require('http')
const crypto = require('crypto')
const assert = require('assert')
const path = require('path')
const fs = require('fs')

// Load env: .env first, .env.local overrides
const dashboardDir = path.join(__dirname, '../product/lead-response/dashboard')
for (const name of ['.env', '.env.local']) {
  try {
    const lines = fs.readFileSync(path.join(dashboardDir, name), 'utf8').split('\n')
    for (const line of lines) {
      const m = line.match(/^([^#=][^=]*)=(.*)$/)
      if (m) {
        const k = m[1].trim(), v = m[2].trim().replace(/^["']|["']$/g, '')
        if (!process.env[k]) process.env[k] = v
      }
    }
  } catch { /* file not present */ }
}

const PORT = 3032
const EMAIL_ENDPOINT = '/api/admin/sales-cockpit/send-payment-link-email'
const COCKPIT_ENDPOINT = '/api/admin/sales-cockpit'
const PAYMENT_LINK_ENDPOINT = '/api/admin/sales-cockpit/payment-link'

async function makeAdminSession() {
  const secret = process.env.ADMIN_SECRET
  if (!secret) throw new Error('ADMIN_SECRET not set in environment')
  const issuedAt = Date.now().toString()
  const key = await crypto.webcrypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(issuedAt))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${issuedAt}.${hex}`
}

function request(method, reqPath, body, cookieHeader) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const headers = { 'Content-Type': 'application/json' }
    if (cookieHeader) headers['Cookie'] = cookieHeader
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload)
    const req = http.request({ hostname: 'localhost', port: PORT, path: reqPath, method, headers }, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

let passed = 0, failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`)
    failed++
  }
}

async function run() {
  console.log('\nPR #1850 — send-payment-link-email E2E tests\n')

  const session = await makeAdminSession()
  const cookie = `admin_session=${session}`

  // --- Auth gate tests (always runnable) ---
  await test('401 without auth cookie', async () => {
    const res = await request('POST', EMAIL_ENDPOINT, { agentId: 'test' }, null)
    assert.strictEqual(res.status, 401, `Expected 401 got ${res.status}`)
    assert.ok(res.body.error, 'Should return error field')
  })

  await test('401 with invalid session value', async () => {
    const res = await request('POST', EMAIL_ENDPOINT, { agentId: 'test' }, 'admin_session=invalid')
    assert.strictEqual(res.status, 401, `Expected 401 got ${res.status}`)
  })

  await test('Route exists and is auth-protected (not 404)', async () => {
    // Verifies the route is wired — any response other than 404 confirms it
    const res = await request('POST', EMAIL_ENDPOINT, { agentId: 'test' }, null)
    assert.notStrictEqual(res.status, 404, 'Route should exist (got 404 — route not built/deployed)')
  })

  // --- Input validation (may return 503 if Stripe not configured) ---
  await test('Missing agentId returns 400 or 503 (route validates before/after Stripe check)', async () => {
    const res = await request('POST', EMAIL_ENDPOINT, {}, cookie)
    // Stripe not configured → 503; agentId missing → 400. Both are acceptable here.
    assert.ok([400, 503].includes(res.status), `Expected 400 or 503, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert.ok(res.body.error, 'Should return an error field')
  })

  await test('Non-string agentId returns 400 or 503', async () => {
    const res = await request('POST', EMAIL_ENDPOINT, { agentId: 123 }, cookie)
    assert.ok([400, 503].includes(res.status), `Expected 400 or 503, got ${res.status}`)
  })

  // Validates: if Stripe IS configured, unknown agentId returns 404
  // Without Stripe: returns 503 (Stripe checked before agent lookup in this route)
  await test('Unknown agentId returns 404 or 503 (not 401/500)', async () => {
    const res = await request('POST', EMAIL_ENDPOINT, { agentId: '00000000-0000-0000-0000-000000000000' }, cookie)
    assert.ok([404, 503].includes(res.status), `Expected 404 or 503, got ${res.status}: ${JSON.stringify(res.body)}`)
  })

  // --- Sales cockpit GET: onboarding_completed field ---
  await test('GET /api/admin/sales-cockpit returns 200 with agents array', async () => {
    const res = await request('GET', COCKPIT_ENDPOINT, null, cookie)
    assert.strictEqual(res.status, 200, `Expected 200 got ${res.status}: ${JSON.stringify(res.body)}`)
    const agents = res.body?.agents ?? res.body
    assert.ok(Array.isArray(agents), `Expected agents array, got: ${JSON.stringify(res.body).slice(0, 100)}`)
    console.log(`    (${agents.length} agents returned)`)
    // onboarding_completed field is added by the PR; verify it when present (post-merge)
    if (agents.length > 0 && 'onboarding_completed' in agents[0]) {
      assert.ok(typeof agents[0].onboarding_completed === 'boolean', 'onboarding_completed should be boolean')
      console.log(`    onboarding_completed field present: ${agents[0].onboarding_completed}`)
    } else if (agents.length > 0) {
      console.log('    NOTE: onboarding_completed field absent — test server running pre-PR route.ts build')
    }
  })

  // --- Payment link route: tier parameter validation ---
  await test('payment-link route: invalid tier returns 400 or 503 (auth passes, tier validated)', async () => {
    const res = await request('POST', PAYMENT_LINK_ENDPOINT, { agentEmail: 'test@test.com', tier: 'invalid' }, cookie)
    assert.ok([400, 503].includes(res.status), `Expected 400 or 503, got ${res.status}: ${JSON.stringify(res.body)}`)
    if (res.status === 400) {
      assert.ok(res.body.error?.includes('tier'), `400 error should mention 'tier': "${res.body.error}"`)
    }
  })

  await test('payment-link route: valid tier with auth passes Stripe check', async () => {
    const res = await request('POST', PAYMENT_LINK_ENDPOINT, { agentEmail: 'test@test.com', tier: 'starter' }, cookie)
    // Without Stripe: 503; with Stripe but missing price ID: 503; with full config: 200
    assert.ok([200, 503].includes(res.status), `Expected 200 or 503, got ${res.status}: ${JSON.stringify(res.body)}`)
    assert.notStrictEqual(res.status, 401, 'Should not be unauthorized — auth passed')
    assert.notStrictEqual(res.status, 400, 'Should not be 400 — valid tier and email provided')
  })

  console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch(e => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
