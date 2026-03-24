/**
 * E2E Runtime Test: fix-product-spec-selfserve-frictionless-onboarding
 * Task ID: 18f7a694-0fdd-4a77-a972-d92a46f55bed
 *
 * Tests RUNTIME BEHAVIOR via HTTP requests — NOT static file analysis.
 * Verifies PRD-FRICTIONLESS-ONBOARDING-001 acceptance criteria against the
 * live Vercel deployment.
 */

'use strict'

const https = require('https')
const assert = require('assert')

const BASE_URL = 'https://leadflow-ai-five.vercel.app'
const TIMEOUT_MS = 15000

let passed = 0
let failed = 0
const failures = []

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const timer = setTimeout(() => reject(new Error(`Timeout: ${path}`)), TIMEOUT_MS)
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }
    const req = https.request(opts, (res) => {
      clearTimeout(timer)
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(body) } catch { /* not JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, body, json })
      })
    })
    req.on('error', (e) => { clearTimeout(timer); reject(e) })
    if (options.body) req.write(JSON.stringify(options.body))
    req.end()
  })
}

async function test(label, fn) {
  try {
    await fn()
    console.log(`  ✅ ${label}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${label}: ${err.message}`)
    failed++
    failures.push({ label, error: err.message })
  }
}

// ---------------------------------------------------------------------------
// FR-8: /api/events/track — runtime behavior
// ---------------------------------------------------------------------------

async function runTests() {
  console.log('\n📋 FR-8: Event tracking endpoint — runtime HTTP checks')

  await test('POST /api/events/track returns 200 for valid event', async () => {
    const res = await request('/api/events/track', {
      method: 'POST',
      body: { event: 'trial_cta_clicked' },
    })
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`)
    assert.ok(res.json, 'Response must be JSON')
    assert.strictEqual(res.json.success, true, 'success must be true')
  })

  await test('POST /api/events/track returns 400 for invalid event', async () => {
    const res = await request('/api/events/track', {
      method: 'POST',
      body: { event: 'arbitrary_injection_attempt' },
    })
    assert.strictEqual(res.status, 400, `Expected 400 for unknown event, got ${res.status}`)
    assert.ok(res.json?.error, 'Must return error message for invalid event')
  })

  await test('POST /api/events/track returns 400 when event is missing', async () => {
    const res = await request('/api/events/track', {
      method: 'POST',
      body: { properties: { foo: 'bar' } },
    })
    assert.strictEqual(res.status, 400, `Expected 400 for missing event, got ${res.status}`)
  })

  await test('POST /api/events/track accepts all 10 PRD funnel events', async () => {
    const events = [
      'trial_cta_clicked',
      'trial_signup_started',
      'trial_signup_completed',
      'dashboard_first_paint',
      'sample_data_rendered',
      'wizard_started',
      'wizard_step_completed',
      'aha_simulation_started',
      'aha_simulation_completed',
      'onboarding_completed',
    ]
    for (const event of events) {
      const res = await request('/api/events/track', {
        method: 'POST',
        body: { event, properties: { test: true } },
      })
      assert.strictEqual(res.status, 200, `Event "${event}" should return 200, got ${res.status}`)
      assert.strictEqual(res.json?.success, true, `Event "${event}" should return success:true`)
    }
  })

  await test('POST /api/events/track is non-blocking (never returns 5xx)', async () => {
    // Send malformed properties — should still return 200 (non-critical endpoint)
    const res = await request('/api/events/track', {
      method: 'POST',
      body: { event: 'trial_cta_clicked', properties: null },
    })
    assert.ok(res.status < 500, `Endpoint must not 5xx even with null properties, got ${res.status}`)
  })

  // ---------------------------------------------------------------------------
  // FR-1/FR-2: Landing page and trial signup route reachability
  // ---------------------------------------------------------------------------
  console.log('\n📋 FR-1: Landing page runtime checks')

  await test('GET / returns 200 (landing page is live)', async () => {
    const res = await request('/')
    assert.strictEqual(res.status, 200, `Expected 200 for landing page, got ${res.status}`)
  })

  await test('GET / includes 14-day trial copy (not 30-day)', async () => {
    const res = await request('/')
    assert.ok(
      res.body.includes('14-day') || res.body.includes('14 day'),
      'Landing page must mention 14-day trial'
    )
    // Also confirm 30-day is not mentioned in a trial context
    const has30Day = /30[ -]day trial/i.test(res.body)
    assert.ok(!has30Day, 'Landing page must not say 30-day trial')
  })

  await test('GET / includes link to /signup/trial (CTA path)', async () => {
    const res = await request('/')
    assert.ok(
      res.body.includes('/signup/trial'),
      'Landing page must link to /signup/trial'
    )
  })

  console.log('\n📋 FR-2/FR-3: Trial signup route — request validation')

  await test('POST /api/auth/trial-signup returns 400 when email is missing', async () => {
    const res = await request('/api/auth/trial-signup', {
      method: 'POST',
      body: { password: 'Test1234!' },
    })
    assert.strictEqual(res.status, 400, `Expected 400 for missing email, got ${res.status}`)
    assert.ok(res.json?.error, 'Must return error message')
  })

  await test('POST /api/auth/trial-signup returns 400 when password is missing', async () => {
    const res = await request('/api/auth/trial-signup', {
      method: 'POST',
      body: { email: 'test@example.com' },
    })
    assert.strictEqual(res.status, 400, `Expected 400 for missing password, got ${res.status}`)
  })

  await test('POST /api/auth/trial-signup returns 400 for invalid email format', async () => {
    const res = await request('/api/auth/trial-signup', {
      method: 'POST',
      body: { email: 'not-an-email', password: 'Test1234!' },
    })
    assert.strictEqual(res.status, 400, `Expected 400 for invalid email, got ${res.status}`)
  })

  await test('POST /api/auth/trial-signup returns 400 for password < 8 chars', async () => {
    const res = await request('/api/auth/trial-signup', {
      method: 'POST',
      body: { email: 'test@example.com', password: 'short' },
    })
    assert.strictEqual(res.status, 400, `Expected 400 for short password, got ${res.status}`)
  })

  // ---------------------------------------------------------------------------
  // FR-4: Sample leads API
  // ---------------------------------------------------------------------------
  console.log('\n📋 FR-4: Sample leads API — runtime check')

  await test('GET /api/sample-leads route exists (not 404)', async () => {
    const res = await request('/api/sample-leads')
    // Route should exist: 200 (unauthenticated = sample data) or 401 (auth required), not 404
    assert.notStrictEqual(res.status, 404, '/api/sample-leads route must exist (not 404)')
  })

  // ---------------------------------------------------------------------------
  // Deployment health
  // ---------------------------------------------------------------------------
  console.log('\n📋 Deployment health checks')

  await test('GET /signup/trial returns 200 (trial signup page is live)', async () => {
    const res = await request('/signup/trial')
    assert.strictEqual(res.status, 200, `Expected 200 for /signup/trial, got ${res.status}`)
  })

  await test('GET /dashboard returns 200 or 307 (dashboard exists)', async () => {
    const res = await request('/dashboard')
    // Dashboard may redirect unauthenticated users to /login — that is acceptable
    assert.ok(
      res.status === 200 || res.status === 307 || res.status === 302 || res.status === 308,
      `Expected 200 or redirect for /dashboard, got ${res.status}`
    )
  })

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log(`\n📊 E2E Results: ${passed} passed, ${failed} failed`)
  if (failures.length > 0) {
    console.log('\nFailed tests:')
    failures.forEach((f) => console.log(`  - ${f.label}: ${f.error}`))
    process.exit(1)
  } else {
    console.log('\n✅ All runtime E2E checks pass for frictionless onboarding')
    process.exit(0)
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
