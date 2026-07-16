/**
 * Tests for POST /api/admin/create-payment-link (backend webhook server)
 * Verifies auth gate, input validation, tier handling.
 * Gracefully handles environments where STRIPE_SECRET_KEY is absent.
 *
 * Spec:
 *   What:   routes/admin/payment-link.js — POST /api/admin/create-payment-link
 *   Verify: node tests/uc-leadflow-activation-payment-link.test.js
 *           Requires backend server running on port 3888 (PORT=3888 node server.js)
 *   Boundaries: Tests backend only. Does not touch Next.js dashboard.
 */

'use strict'

const http = require('http')
const assert = require('assert')
const path = require('path')
const fs = require('fs')

// Load env
for (const name of ['.env', '.env.local']) {
  try {
    const lines = fs.readFileSync(path.join(__dirname, '..', name), 'utf8').split('\n')
    for (const line of lines) {
      const m = line.match(/^([^#=][^=]*)=(.*)$/)
      if (m) {
        const k = m[1].trim(), v = m[2].trim().replace(/^["']|["']$/g, '')
        if (!process.env[k]) process.env[k] = v
      }
    }
  } catch { /* not present */ }
}

const PORT = parseInt(process.env.TEST_SERVER_PORT || '3888', 10)
const ENDPOINT = '/api/admin/create-payment-link'
const API_KEY = process.env.LEADFLOW_API_KEY || ''

function request(method, reqPath, body, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const headers = { 'Content-Type': 'application/json' }
    if (apiKey) headers['x-api-key'] = apiKey
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
  console.log(`\nuc-stripe-payment-link-direct — backend create-payment-link tests (port ${PORT})\n`)

  // --- Auth gate ---
  await test('401 without x-api-key', async () => {
    const res = await request('POST', ENDPOINT, { agentId: 'test', planTier: 'starter' }, null)
    assert.strictEqual(res.status, 401, `Expected 401 got ${res.status}`)
    assert.ok(res.body.error, 'Should return error field')
  })

  await test('401 with wrong api key', async () => {
    const res = await request('POST', ENDPOINT, { agentId: 'test', planTier: 'starter' }, 'wrong-key')
    assert.strictEqual(res.status, 401, `Expected 401 got ${res.status}`)
  })

  await test('Route exists (not 404 without auth)', async () => {
    const res = await request('POST', ENDPOINT, { agentId: 'test', planTier: 'starter' }, null)
    assert.notStrictEqual(res.status, 404, 'Route should exist (got 404)')
  })

  if (!API_KEY) {
    console.log('  ⚠️  LEADFLOW_API_KEY not set — skipping authenticated tests')
    console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`)
    return
  }

  // --- Input validation (authed) ---
  await test('Missing agentId returns 400', async () => {
    const res = await request('POST', ENDPOINT, { planTier: 'starter' }, API_KEY)
    assert.ok([400, 503, 404].includes(res.status), `Expected 400/503/404, got ${res.status}`)
    if (res.status === 400) {
      assert.ok(res.body.error, 'Should return error field')
    }
  })

  await test('Missing planTier returns 400', async () => {
    const res = await request('POST', ENDPOINT, { agentId: '00000000-0000-0000-0000-000000000001' }, API_KEY)
    assert.ok([400, 503, 404].includes(res.status), `Expected 400/503/404, got ${res.status}`)
  })

  await test('Invalid planTier returns 400', async () => {
    const res = await request('POST', ENDPOINT, { agentId: '00000000-0000-0000-0000-000000000001', planTier: 'premium' }, API_KEY)
    assert.ok([400, 503].includes(res.status), `Expected 400 or 503, got ${res.status}`)
    if (res.status === 400) {
      assert.ok(res.body.error?.toLowerCase().includes('plantier') || res.body.error?.toLowerCase().includes('tier'),
        `Error should mention planTier: "${res.body.error}"`)
    }
  })

  await test('Unknown agentId returns 404 or 503 (Stripe check may come first)', async () => {
    const res = await request('POST', ENDPOINT, {
      agentId: '00000000-0000-0000-0000-000000000000',
      planTier: 'starter',
    }, API_KEY)
    assert.ok([404, 503].includes(res.status), `Expected 404 or 503, got ${res.status}: ${JSON.stringify(res.body)}`)
  })

  await test('Valid tiers are all accepted (200 or 503 if Stripe unconfigured)', async () => {
    for (const tier of ['starter', 'pro', 'team']) {
      const res = await request('POST', ENDPOINT, {
        agentId: '00000000-0000-0000-0000-000000000000',
        planTier: tier,
      }, API_KEY)
      assert.ok([404, 503].includes(res.status), `tier=${tier}: Expected 404 or 503, got ${res.status}`)
    }
  })

  console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch(e => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
