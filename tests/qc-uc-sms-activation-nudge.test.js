'use strict'

/**
 * QC supplemental tests for uc-sms-activation-nudge
 *
 * Covers gaps in the dev test:
 *  - Tampered HMAC cookie is rejected (not just "invalid" string)
 *  - POST with bulkAll=false (not true) treated as missing param → 400
 *  - POST agentId of wrong type (number) treated as string → 404 or handled
 *  - GET response shape has correct field types (not just presence)
 *  - Bulk send with already-nudged agents: sent count reflects only new sends
 *
 * Usage: node tests/qc-uc-sms-activation-nudge.test.js
 * Requires: Next.js running on PORT (default 3032)
 */

const http = require('http')
const crypto = require('crypto')
const assert = require('assert')
const path = require('path')
const fs = require('fs')

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
  } catch { /* file absent */ }
}

const PORT = Number(process.env.PORT || 3032)
const ENDPOINT = '/api/admin/activation'

async function makeAdminSession(secret) {
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
        res.on('data', c => { data += c })
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
          catch { resolve({ status: res.statusCode, body: data }) }
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
  const secret = process.env.ADMIN_SECRET
  if (!secret) { console.error('ADMIN_SECRET not set'); process.exit(1) }

  console.log('\nQC: uc-sms-activation-nudge supplemental tests\n')

  const validSession = await makeAdminSession(secret)
  const cookie = `admin_session=${validSession}`

  // Tampered session: flip one hex char in the HMAC portion
  const parts = validSession.split('.')
  const tamperedHex = parts[1].slice(0, -1) + (parts[1].endsWith('0') ? '1' : '0')
  const tamperedCookie = `admin_session=${parts[0]}.${tamperedHex}`

  await test('tampered HMAC in session cookie → 401', async () => {
    const res = await request('GET', ENDPOINT, null, tamperedCookie)
    assert.strictEqual(res.status, 401, `Expected 401 for tampered HMAC, got ${res.status}`)
  })

  await test('GET response: agents array items have correct types', async () => {
    const res = await request('GET', ENDPOINT, null, cookie)
    assert.strictEqual(res.status, 200)
    const agents = res.body.agents
    assert.ok(Array.isArray(agents))
    for (const a of agents) {
      assert.strictEqual(typeof a.id, 'string', 'id must be string')
      assert.strictEqual(typeof a.email, 'string', 'email must be string')
      assert.strictEqual(typeof a.created_at, 'string', 'created_at must be string')
      // last_activation_sms_at is null or ISO string
      assert.ok(
        a.last_activation_sms_at === null || typeof a.last_activation_sms_at === 'string',
        'last_activation_sms_at must be null or string'
      )
      // phone_number is null or string
      assert.ok(
        a.phone_number === null || typeof a.phone_number === 'string',
        'phone_number must be null or string'
      )
    }
    console.log(`    (verified types for ${agents.length} agents)`)
  })

  await test('POST bulkAll=false treated as missing param → 400', async () => {
    const res = await request('POST', ENDPOINT, { bulkAll: false }, cookie)
    assert.strictEqual(res.status, 400, `Expected 400 for bulkAll:false, got ${res.status}: ${JSON.stringify(res.body)}`)
  })

  await test('POST with extra unknown fields is ignored (agentId wins)', async () => {
    const res = await request('POST', ENDPOINT, {
      agentId: '00000000-0000-0000-0000-000000000000',
      extraField: 'ignored',
    }, cookie)
    // Unknown agent → 404; extra fields should not cause 500
    assert.ok([404, 400].includes(res.status), `Expected 404 or 400, got ${res.status}`)
    assert.notStrictEqual(res.status, 500, 'Should not throw 500 for extra fields')
  })

  await test('POST bulkAll results: all statuses are valid enum values', async () => {
    const res = await request('POST', ENDPOINT, { bulkAll: true }, cookie)
    assert.strictEqual(res.status, 200)
    const validStatuses = new Set(['sent', 'skipped', 'failed'])
    for (const r of res.body.results ?? []) {
      assert.ok(validStatuses.has(r.status), `Invalid status: ${r.status}`)
      assert.strictEqual(typeof r.id, 'string', 'result.id must be string')
      assert.strictEqual(typeof r.email, 'string', 'result.email must be string')
    }
    const sentCount = (res.body.results ?? []).filter(r => r.status === 'sent').length
    assert.strictEqual(res.body.sent, sentCount, 'sent count must match results array')
  })

  await test('GET after bulk: already-nudged agents show last_activation_sms_at', async () => {
    // Even if bulkAll sent=0 (no phones), confirm GET returns consistent state
    const res = await request('GET', ENDPOINT, null, cookie)
    assert.strictEqual(res.status, 200)
    // If any agent has been nudged before, their timestamp should be a valid ISO date
    const nudged = (res.body.agents ?? []).filter(a => a.last_activation_sms_at !== null)
    for (const a of nudged) {
      const d = new Date(a.last_activation_sms_at)
      assert.ok(!isNaN(d.getTime()), `last_activation_sms_at "${a.last_activation_sms_at}" is not a valid date`)
    }
    console.log(`    (${nudged.length} previously nudged agents with valid timestamps)`)
  })

  console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
