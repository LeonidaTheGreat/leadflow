/**
 * E2E tests for uc-sms-activation-nudge — Admin SMS Activation Nudge
 *
 * Covers:
 *   - Auth gate: 401 without valid admin_session
 *   - GET /api/admin/activation returns agents array
 *   - POST /api/admin/activation validates body
 *   - POST with agentId returns 404 for unknown agent
 *   - POST bulkAll: returns sent count
 *
 * Usage: node tests/uc-sms-activation-nudge.test.js
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
const ENDPOINT = '/api/admin/activation'

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
    const req = http.request(
      { hostname: 'localhost', port: PORT, path: reqPath, method, headers },
      res => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) })
          } catch { resolve({ status: res.statusCode, body: data }) }
        })
      }
    )
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
  console.log('\nuc-sms-activation-nudge E2E tests\n')

  const session = await makeAdminSession()
  const cookie = `admin_session=${session}`

  // --- Auth gate ---
  await test('GET 401 without auth cookie', async () => {
    const res = await request('GET', ENDPOINT, null, null)
    assert.strictEqual(res.status, 401, `Expected 401 got ${res.status}`)
    assert.ok(res.body.error, 'Should return error field')
  })

  await test('GET 401 with invalid session', async () => {
    const res = await request('GET', ENDPOINT, null, 'admin_session=invalid')
    assert.strictEqual(res.status, 401, `Expected 401 got ${res.status}`)
  })

  await test('POST 401 without auth cookie', async () => {
    const res = await request('POST', ENDPOINT, { agentId: 'test' }, null)
    assert.strictEqual(res.status, 401, `Expected 401 got ${res.status}`)
  })

  await test('Route exists — not 404', async () => {
    const res = await request('GET', ENDPOINT, null, null)
    assert.notStrictEqual(res.status, 404, 'Route should exist (got 404 — route not built/deployed)')
  })

  // --- GET with valid auth ---
  await test('GET returns 200 with agents array', async () => {
    const res = await request('GET', ENDPOINT, null, cookie)
    assert.strictEqual(res.status, 200, `Expected 200 got ${res.status}: ${JSON.stringify(res.body)}`)
    assert.ok(Array.isArray(res.body.agents), `Expected agents array, got: ${JSON.stringify(res.body).slice(0, 100)}`)
    console.log(`    (${res.body.agents.length} stuck agents)`)
  })

  await test('GET agents have required fields', async () => {
    const res = await request('GET', ENDPOINT, null, cookie)
    assert.strictEqual(res.status, 200, `Expected 200 got ${res.status}`)
    const agents = res.body.agents
    if (agents.length > 0) {
      const a = agents[0]
      assert.ok('id' in a, 'agent should have id')
      assert.ok('email' in a, 'agent should have email')
      assert.ok('phone_number' in a, 'agent should have phone_number')
      assert.ok('created_at' in a, 'agent should have created_at')
      assert.ok('last_activation_sms_at' in a, 'agent should have last_activation_sms_at')
    }
  })

  // --- POST validation ---
  await test('POST with no body returns 400', async () => {
    const res = await request('POST', ENDPOINT, {}, cookie)
    assert.strictEqual(res.status, 400, `Expected 400 got ${res.status}: ${JSON.stringify(res.body)}`)
    assert.ok(res.body.error, 'Should return error field')
  })

  await test('POST unknown agentId returns 404', async () => {
    const res = await request('POST', ENDPOINT, { agentId: '00000000-0000-0000-0000-000000000000' }, cookie)
    assert.strictEqual(res.status, 404, `Expected 404 got ${res.status}: ${JSON.stringify(res.body)}`)
  })

  await test('POST bulkAll returns sent count and results array', async () => {
    const res = await request('POST', ENDPOINT, { bulkAll: true }, cookie)
    assert.strictEqual(res.status, 200, `Expected 200 got ${res.status}: ${JSON.stringify(res.body)}`)
    assert.ok(typeof res.body.sent === 'number', 'sent should be a number')
    assert.ok(Array.isArray(res.body.results), 'results should be an array')
    console.log(`    (bulkAll sent=${res.body.sent})`)
  })

  await test('POST bulkAll results have status field', async () => {
    const res = await request('POST', ENDPOINT, { bulkAll: true }, cookie)
    assert.strictEqual(res.status, 200)
    for (const r of res.body.results ?? []) {
      assert.ok(['sent', 'skipped', 'failed'].includes(r.status), `Unexpected status: ${r.status}`)
      assert.ok(r.id, 'result should have id')
      assert.ok(r.email, 'result should have email')
    }
  })

  console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch(e => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
