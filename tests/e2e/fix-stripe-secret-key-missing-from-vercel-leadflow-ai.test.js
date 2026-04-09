/**
 * QC E2E Test: fix-stripe-secret-key-missing-from-vercel-leadflow-ai-
 * =====================================================================
 * Task ID: 19e4c2c6-34d9-42a7-bc87-a6d97bb7166c
 *
 * Tests acceptance criteria from prd-fix-stripe-env-vars-vercel:
 *   AC1: Checkout endpoint NOT 503 "Stripe not configured"
 *   AC2: Webhook endpoint NOT 503 "Stripe not configured"
 *   AC3: Stripe configuration properly detected (no hardcoded placeholder keys)
 *
 * NOTE: These tests exercise RUNTIME BEHAVIOR against production.
 * They WILL FAIL until Stojan sets STRIPE_SECRET_KEY in Vercel Dashboard.
 */

'use strict'

const assert = require('assert')
const https = require('https')

const BASE_URL = 'https://leadflow-ai-five.vercel.app'

let passed = 0
let failed = 0

async function asyncTest(label, fn) {
  try {
    await fn()
    console.log(`  ✅ ${label}`)
    passed++
  } catch (e) {
    console.error(`  ❌ ${label}: ${e.message}`)
    failed++
  }
}

function postJSON(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const urlObj = new URL(url)
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

async function main() {
  console.log('\n══════════════════════════════════════════════════')
  console.log('  QC: fix-stripe-secret-key-missing-from-vercel-leadflow-ai-')
  console.log('  Task: 19e4c2c6-34d9-42a7-bc87-a6d97bb7166c')
  console.log('  Target:', BASE_URL)
  console.log('══════════════════════════════════════════════════\n')

  // AC1: Checkout endpoint must NOT return 503 "Stripe not configured"
  console.log('[AC1] /api/billing/create-checkout — must not be 503')
  await asyncTest('Checkout endpoint not 503 (STRIPE_SECRET_KEY present)', async () => {
    const r = await postJSON(`${BASE_URL}/api/billing/create-checkout`, {
      tier: 'starter_monthly',
      agentId: '00000000-0000-0000-0000-000000000001',
      email: 'qc@test.com',
    })
    const msg = `Status: ${r.status}, Body: ${JSON.stringify(r.body)}`
    assert.notStrictEqual(r.status, 503, `503 — STRIPE_SECRET_KEY missing. ${msg}`)
    if (typeof r.body === 'object' && r.body.error) {
      assert.notStrictEqual(r.body.error, 'Stripe not configured', `Stripe not configured. ${msg}`)
    }
  })

  // AC2: Webhook endpoint must NOT return 503 "Stripe not configured"
  console.log('\n[AC2] /api/webhooks/stripe — must not be 503')
  await asyncTest('Webhook endpoint not 503 (STRIPE_WEBHOOK_SECRET present)', async () => {
    const r = await postJSON(`${BASE_URL}/api/webhooks/stripe`, {})
    const msg = `Status: ${r.status}, Body: ${JSON.stringify(r.body)}`
    assert.notStrictEqual(r.status, 503, `503 — STRIPE_WEBHOOK_SECRET missing. ${msg}`)
    if (typeof r.body === 'object' && r.body.error) {
      assert.notStrictEqual(r.body.error, 'Stripe not configured', `Stripe not configured. ${msg}`)
    }
  })

  // AC3: Webhook returns 400 (bad signature) when env var is set but no valid payload
  console.log('\n[AC3] Webhook returns 400 (bad sig) not 503 (missing key)')
  await asyncTest('Webhook with no payload → 400 bad signature (not 503)', async () => {
    const r = await postJSON(`${BASE_URL}/api/webhooks/stripe`, { test: true })
    const bodyStr = JSON.stringify(r.body)
    assert.ok(
      !bodyStr.includes('Stripe not configured'),
      `"Stripe not configured" in response — env var missing. Status: ${r.status}`
    )
    // If key is set, a random payload → 400 (can't verify signature) not 503
    assert.ok(
      r.status === 400 || r.status === 401 || r.status === 422,
      `Expected 4xx (bad signature), got ${r.status} — ${bodyStr}`
    )
  })

  console.log(`\n${'═'.repeat(50)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    console.error('\n❌ REJECTED — Acceptance criteria not met')
    console.error('Root cause: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET')
    console.error('not set in Vercel production environment.')
    console.error('\nAction required: Stojan must add env vars in Vercel Dashboard')
    console.error('https://vercel.com → leadflow-ai → Settings → Environment Variables')
    process.exit(1)
  } else {
    console.log('\n✅ APPROVED — Stripe env vars confirmed in production')
  }
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1) })
