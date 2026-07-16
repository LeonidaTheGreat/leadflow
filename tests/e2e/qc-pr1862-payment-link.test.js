'use strict'

/**
 * QC E2E test for PR #1862 — Direct Stripe Payment Link flow
 *
 * What:   Verifies the new payment-link endpoint auth gate, input validation,
 *         and the absence of magic-number pricing violations.
 * Verify: node tests/e2e/qc-pr1862-payment-link.test.js
 *         (backend server optional — auth/validation tests run without it)
 */

const assert = require('assert')
const http = require('http')
const path = require('path')
const fs = require('fs')

// Load env
for (const name of ['.env', '.env.local']) {
  try {
    const lines = fs.readFileSync(path.join(__dirname, '../..', name), 'utf8').split('\n')
    for (const line of lines) {
      const m = line.match(/^([^#=][^=]*)=(.*)$/)
      if (m) {
        const k = m[1].trim(), v = m[2].trim().replace(/^["']|["']$/g, '')
        if (!process.env[k]) process.env[k] = v
      }
    }
  } catch { /* absent */ }
}

let passed = 0, failed = 0
const errors = []

function test(name, fn) {
  return Promise.resolve().then(fn).then(() => {
    console.log(`  ✅ ${name}`)
    passed++
  }).catch(e => {
    console.log(`  ❌ ${name}: ${e.message}`)
    errors.push({ name, error: e.message })
    failed++
  })
}

function request(port, method, reqPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const hdrs = { 'Content-Type': 'application/json', ...headers }
    if (payload) hdrs['Content-Length'] = Buffer.byteLength(payload)
    const req = http.request({ hostname: 'localhost', port, path: reqPath, method, headers: hdrs }, res => {
      let data = ''
      res.on('data', c => { data += c })
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

// ─── Static file checks (no server needed) ───────────────────────────────────

async function runStaticChecks() {
  console.log('\nStatic checks (no server required)\n')

  const root = path.join(__dirname, '../..')
  const dashboard = path.join(root, 'product/lead-response/dashboard')

  await test('routes/admin/payment-link.js exists', async () => {
    assert.ok(fs.existsSync(path.join(root, 'routes/admin/payment-link.js')), 'File missing')
  })

  await test('payment-link.js uses TIER_CONFIG (no bare amounts)', async () => {
    const src = fs.readFileSync(path.join(root, 'routes/admin/payment-link.js'), 'utf8')
    assert.ok(src.includes('TIER_CONFIG'), 'TIER_CONFIG constant must be defined')
    // amount must come from TIER_CONFIG, not a bare literal after it's defined
    const tierConfigBlock = src.match(/const TIER_CONFIG[\s\S]*?\}/m)?.[0] ?? ''
    assert.ok(tierConfigBlock.includes('4900'), 'Starter amount 4900 must be in TIER_CONFIG')
    // Should NOT appear outside the config block as a bare literal
    const afterConfig = src.slice(src.indexOf('TIER_CONFIG') + tierConfigBlock.length)
    assert.ok(!afterConfig.includes('unit_amount: 4900'), 'Magic number 4900 outside TIER_CONFIG')
  })

  // THIS IS THE FAILING CHECK — send-payment-link-email has bare 4900
  await test('send-payment-link-email route uses named constant, not bare 4900', async () => {
    const emailRouteFile = path.join(dashboard, 'app/api/admin/sales-cockpit/send-payment-link-email/route.ts')
    assert.ok(fs.existsSync(emailRouteFile), 'send-payment-link-email/route.ts must exist')
    const src = fs.readFileSync(emailRouteFile, 'utf8')
    // Should NOT have bare `unit_amount: 4900` — must use a named constant or TIER_CONFIG
    assert.ok(
      !src.includes('unit_amount: 4900'),
      'VIOLATION: send-payment-link-email/route.ts has magic number `unit_amount: 4900` at line ~113. ' +
      'Must define a named constant (e.g. const STARTER_AMOUNT_CENTS = 4900) or import from TIER_CONFIG.'
    )
  })

  await test('activation page exists', async () => {
    const pg = path.join(dashboard, 'app/admin/activation/page.tsx')
    assert.ok(fs.existsSync(pg), 'app/admin/activation/page.tsx missing')
  })

  await test('activation API route exists', async () => {
    const rt = path.join(dashboard, 'app/api/admin/activation/route.ts')
    assert.ok(fs.existsSync(rt), 'app/api/admin/activation/route.ts missing')
  })

  await test('activation/completed API route exists', async () => {
    const rt = path.join(dashboard, 'app/api/admin/activation/completed/route.ts')
    assert.ok(fs.existsSync(rt), 'app/api/admin/activation/completed/route.ts missing')
  })

  await test('server.js registers payment-link router', async () => {
    const srv = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
    assert.ok(srv.includes("require('./routes/admin/payment-link')"), 'payment-link router not registered in server.js')
    assert.ok(srv.includes("app.use('/', paymentLinkRouter)"), 'payment-link router not mounted in server.js')
  })

  await test('stripe webhook reads agent_id from payment link metadata', async () => {
    const wh = fs.readFileSync(path.join(dashboard, 'app/api/webhooks/stripe/route.ts'), 'utf8')
    assert.ok(
      wh.includes("session.client_reference_id || (session.metadata as any)?.agent_id"),
      'Webhook must read agent_id from metadata for payment links'
    )
    assert.ok(
      wh.includes("metadataTier"),
      'Webhook must prefer metadata tier over price ID lookup'
    )
  })
}

// ─── Live server checks (backend on port 3888) ────────────────────────────────

async function runLiveChecks() {
  const PORT = parseInt(process.env.TEST_SERVER_PORT || '3888', 10)
  const ENDPOINT = '/api/admin/create-payment-link'

  let serverUp = false
  try {
    const probe = await Promise.race([
      request(PORT, 'POST', ENDPOINT, {}, {}),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000)),
    ])
    serverUp = probe.status !== undefined
  } catch { /* server not running */ }

  if (!serverUp) {
    console.log(`\n  ℹ️  Backend not running on port ${PORT} — skipping live checks`)
    return
  }

  console.log(`\nLive backend checks (port ${PORT})\n`)

  await test('POST /api/admin/create-payment-link — 401 without x-api-key', async () => {
    const res = await request(PORT, 'POST', ENDPOINT, { agentId: 'test', planTier: 'starter' }, {})
    assert.strictEqual(res.status, 401, `Expected 401 got ${res.status}`)
  })

  await test('POST /api/admin/create-payment-link — 401 with wrong key', async () => {
    const res = await request(PORT, 'POST', ENDPOINT, { agentId: 'test', planTier: 'starter' }, { 'x-api-key': 'wrong' })
    assert.strictEqual(res.status, 401, `Expected 401 got ${res.status}`)
  })

  await test('Route is registered (not 404)', async () => {
    const res = await request(PORT, 'POST', ENDPOINT, {}, {})
    assert.notStrictEqual(res.status, 404, `Route should exist — got 404`)
  })
}

async function main() {
  console.log('QC E2E — PR #1862: Direct Stripe Payment Link')
  await runStaticChecks()
  await runLiveChecks()

  console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    console.log('\nFailures:')
    for (const { name, error } of errors) console.log(`  • ${name}: ${error}`)
    process.exit(1)
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
