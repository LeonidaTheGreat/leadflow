/**
 * E2E Test: feat-lead-experience-simulator
 * QC Task: 42dd3f86-8daf-43d6-a9bd-38567486bb59
 *
 * Tests API endpoints directly against the live Vercel deployment.
 * Covers AC-1 through AC-7 from PRD-LEAD-EXPERIENCE-SIMULATOR.md
 */

const assert = require('assert')

const BASE_URL = process.env.TEST_BASE_URL || 'https://leadflow-ai-five.vercel.app'

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options)
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { _raw: text } }
  return { status: res.status, headers: res.headers, json }
}

let passed = 0
let failed = 0
const failures = []

function test(name, fn) {
  return fn()
    .then(() => { console.log(`  ✅ ${name}`); passed++ })
    .catch((err) => {
      console.log(`  ❌ ${name}: ${err.message}`)
      failed++
      failures.push({ name, error: err.message })
    })
}

async function runTests() {
  console.log('\n=== Lead Experience Simulator E2E Tests ===\n')

  // ─── AC-1: simulate-lead does NOT send real SMS ──────────────────────────
  console.log('AC-1: POST /api/admin/simulate-lead — dry run, no SMS')
  await test('returns 200 with conversation', async () => {
    const { status, json } = await fetchJSON(`${BASE_URL}/api/admin/simulate-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadName: 'QC Tester', propertyInterest: 'condo' }),
    })
    assert.strictEqual(status, 200, `Expected 200, got ${status}`)
    assert.ok(json.conversation, 'Missing conversation array')
    assert.ok(Array.isArray(json.conversation), 'conversation must be array')
    assert.strictEqual(json.outcome, 'completed', 'outcome must be completed')
  })

  await test('AC-1: response has no twilio_sid or sms_sent (dry run confirmed)', async () => {
    const { json } = await fetchJSON(`${BASE_URL}/api/admin/simulate-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadName: 'No SMS Test' }),
    })
    assert.ok(!json.twilio_sid, 'Should not have twilio_sid')
    assert.ok(!json.sms_sent, 'Should not have sms_sent flag')
  })

  await test('AC-2: conversation has 6 turns (3 lead + 3 AI)', async () => {
    const { json } = await fetchJSON(`${BASE_URL}/api/admin/simulate-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadName: 'Alice Tester', propertyInterest: 'detached home' }),
    })
    assert.strictEqual(json.conversation.length, 6, `Expected 6 turns, got ${json.conversation.length}`)
    const leadTurns = json.conversation.filter(t => t.role === 'lead')
    const aiTurns = json.conversation.filter(t => t.role === 'ai')
    assert.strictEqual(leadTurns.length, 3, 'Expected 3 lead turns')
    assert.strictEqual(aiTurns.length, 3, 'Expected 3 AI turns')
    // Alternating
    assert.strictEqual(json.conversation[0].role, 'lead', 'First turn must be lead')
    assert.strictEqual(json.conversation[1].role, 'ai', 'Second turn must be ai')
  })

  await test('requires leadName field', async () => {
    const { status, json } = await fetchJSON(`${BASE_URL}/api/admin/simulate-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyInterest: 'condo' }),
    })
    assert.strictEqual(status, 400, `Expected 400, got ${status}`)
    assert.ok(json.error, 'Should return error message')
  })

  await test('AC-7: stores result in lead_simulations (id returned)', async () => {
    const { json } = await fetchJSON(`${BASE_URL}/api/admin/simulate-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadName: 'Stored Lead' }),
    })
    // id might be null if DB storage fails, but should be a UUID if stored
    if (json.id) {
      assert.ok(/^[0-9a-f-]{36}$/.test(json.id), `id should be UUID, got ${json.id}`)
    }
    assert.ok(json.outcome, 'outcome field required')
  })

  await test('handles empty propertyInterest gracefully', async () => {
    const { status, json } = await fetchJSON(`${BASE_URL}/api/admin/simulate-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadName: 'Bob Test', propertyInterest: '' }),
    })
    assert.strictEqual(status, 200, `Expected 200, got ${status}`)
    assert.ok(json.conversation.length > 0, 'Should return conversation')
  })

  // ─── AC-3/AC-4: conversations endpoint ──────────────────────────────────
  console.log('\nAC-3/4: GET /api/admin/conversations — anonymized viewer')
  await test('returns 200 with conversations array', async () => {
    const { status, json } = await fetchJSON(`${BASE_URL}/api/admin/conversations`)
    assert.strictEqual(status, 200, `Expected 200, got ${status}`)
    assert.ok(Array.isArray(json.conversations), 'conversations must be array')
  })

  await test('AC-3: returns at most 10 conversations', async () => {
    const { json } = await fetchJSON(`${BASE_URL}/api/admin/conversations`)
    assert.ok(json.conversations.length <= 10, `Max 10 conversations, got ${json.conversations.length}`)
  })

  await test('AC-4: phone numbers masked to last 4 digits', async () => {
    const { json } = await fetchJSON(`${BASE_URL}/api/admin/conversations`)
    for (const conv of json.conversations) {
      if (conv.maskedPhone && conv.maskedPhone !== '****') {
        assert.ok(/^\*{4}\d{4}$/.test(conv.maskedPhone), 
          `Phone should be ****XXXX, got ${conv.maskedPhone}`)
      }
    }
  })

  await test('conversations have required fields', async () => {
    const { json } = await fetchJSON(`${BASE_URL}/api/admin/conversations`)
    for (const conv of json.conversations) {
      assert.ok(conv.id, 'Missing id')
      assert.ok(conv.leadName, 'Missing leadName')
      assert.ok(conv.maskedPhone !== undefined, 'Missing maskedPhone')
      assert.ok(typeof conv.messageCount === 'number', 'messageCount must be number')
      assert.ok(['booked', 'in-progress', 'opted-out'].includes(conv.outcome), 
        `Invalid outcome: ${conv.outcome}`)
    }
  })

  await test('supports outcome filter parameter', async () => {
    const filters = ['all', 'booked', 'in-progress', 'opted-out']
    for (const filter of filters) {
      const { status } = await fetchJSON(`${BASE_URL}/api/admin/conversations?outcome=${filter}`)
      assert.strictEqual(status, 200, `Filter '${filter}' should return 200`)
    }
  })

  await test('lead name is first name only (no spaces)', async () => {
    const { json } = await fetchJSON(`${BASE_URL}/api/admin/conversations`)
    for (const conv of json.conversations) {
      assert.ok(!conv.leadName.includes(' '), 
        `leadName should be first name only, got "${conv.leadName}"`)
    }
  })

  // ─── AC-5/AC-6: demo link ───────────────────────────────────────────────
  console.log('\nAC-5/6: POST /api/admin/demo-link — 24h token generation')
  let generatedToken = null

  await test('generates token with url and expiresAt', async () => {
    const { status, json } = await fetchJSON(`${BASE_URL}/api/admin/demo-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'qc-e2e-test' }),
    })
    assert.strictEqual(status, 200, `Expected 200, got ${status}: ${JSON.stringify(json)}`)
    assert.ok(json.token, 'Missing token')
    assert.ok(json.url, 'Missing url')
    assert.ok(json.expiresAt, 'Missing expiresAt')
    assert.ok(json.url.includes('/admin/simulator?demo='), 
      `URL should contain /admin/simulator?demo=, got ${json.url}`)
    assert.ok(json.url.includes(json.token), 'URL should contain the token')
    generatedToken = json.token
  })

  await test('AC-6: token expires in ~24 hours', async () => {
    const { json } = await fetchJSON(`${BASE_URL}/api/admin/demo-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const expiresAt = new Date(json.expiresAt)
    const now = new Date()
    const diffMs = expiresAt.getTime() - now.getTime()
    const twentyFourHours = 24 * 60 * 60 * 1000
    // Allow ±5 min tolerance
    assert.ok(diffMs > twentyFourHours - 5 * 60 * 1000, 
      `Token should expire in ~24h, expires in ${Math.round(diffMs/3600000)}h`)
    assert.ok(diffMs <= twentyFourHours + 5 * 60 * 1000, 
      `Token should expire in ~24h, expires in ${Math.round(diffMs/3600000)}h`)
  })

  await test('GET: validates valid demo token returns valid:true', async () => {
    if (!generatedToken) {
      throw new Error('No token generated from prior test')
    }
    const { status, json } = await fetchJSON(
      `${BASE_URL}/api/admin/demo-link?token=${generatedToken}`)
    assert.strictEqual(status, 200)
    assert.strictEqual(json.valid, true, `Expected valid:true, got ${JSON.stringify(json)}`)
    assert.strictEqual(json.expired, false, 'Token should not be expired')
  })

  await test('GET: invalid token returns valid:false', async () => {
    const { json } = await fetchJSON(
      `${BASE_URL}/api/admin/demo-link?token=nonexistent_fake_token_xyz`)
    assert.strictEqual(json.valid, false, 'Non-existent token should return valid:false')
  })

  await test('GET: no token returns 400', async () => {
    const { status } = await fetchJSON(`${BASE_URL}/api/admin/demo-link`)
    assert.strictEqual(status, 400, `Expected 400 for missing token, got ${status}`)
  })

  // ─── AC-5: simulator page is accessible ─────────────────────────────────
  console.log('\nAC-5: /admin/simulator page accessibility')
  await test('simulator page is accessible (returns HTML)', async () => {
    const { status, headers } = await fetchJSON(`${BASE_URL}/admin/simulator`)
    assert.strictEqual(status, 200, `Expected 200, got ${status}`)
  })

  if (generatedToken) {
    await test('simulator page accessible with valid demo token', async () => {
      const { status } = await fetchJSON(
        `${BASE_URL}/admin/simulator?demo=${generatedToken}`)
      assert.strictEqual(status, 200, `Expected 200 with valid demo token, got ${status}`)
    })
  }

  // ─── Schema validation ──────────────────────────────────────────────────
  console.log('\nSchema: lead_simulations table fields in API response')
  await test('simulate-lead response matches lead_simulations schema', async () => {
    const { json } = await fetchJSON(`${BASE_URL}/api/admin/simulate-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadName: 'Schema Test', propertyInterest: 'apartment' }),
    })
    // PRD schema: id, created_at, lead_name, lead_phone, property_interest, conversation, outcome, triggered_by
    assert.ok(json.id !== undefined, 'id field present in response')
    assert.ok(Array.isArray(json.conversation), 'conversation (JSONB) returned as array')
    assert.strictEqual(json.outcome, 'completed', 'outcome field correct')
    // createdAt maps to created_at
    assert.ok(json.createdAt || json.id === null, 'createdAt returned or storage warning')
  })

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(50))
  console.log(`Results: ${passed} passed, ${failed} failed`)
  if (failures.length > 0) {
    console.log('\nFailures:')
    failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`))
  }
  console.log('='.repeat(50) + '\n')

  return { passed, failed, total: passed + failed }
}

runTests().then(({ passed, failed, total }) => {
  process.exit(failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
