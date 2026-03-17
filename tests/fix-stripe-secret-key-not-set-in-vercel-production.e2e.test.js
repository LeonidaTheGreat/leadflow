/**
 * E2E Test: fix-stripe-secret-key-not-set-in-vercel-production
 * =============================================================
 * Task ID: 955ab88f-fcbe-45d6-926c-69fb310ae38f
 *
 * Verifies acceptance criteria from PRD-FIX-STRIPE-ENV-VARS-VERCEL.md:
 *
 * AC1: POST /api/billing/create-checkout → NOT 503 "Stripe not configured"
 * AC2: POST /api/webhooks/stripe         → NOT 503 "Stripe not configured"
 *
 * These tests hit production. A 503 with "Stripe not configured" means
 * STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are still missing from Vercel.
 *
 * CURRENT STATUS: FAILING — env vars not yet set in Vercel production.
 * Requires human action: Stojan must add env vars in Vercel Dashboard.
 */

'use strict'

const assert = require('assert')
const https = require('https')

const BASE_URL = 'https://leadflow-ai-five.vercel.app'

let passed = 0
let failed = 0
const failures = []

async function asyncTest(label, fn) {
  try {
    await fn()
    console.log(`  ✅ ${label}`)
    passed++
  } catch (e) {
    console.error(`  ❌ ${label}`)
    console.error(`     ${e.message}`)
    failed++
    failures.push({ label, error: e.message })
  }
}

function postJSON(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers,
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, body: data })
        }
      })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════')
  console.log('  QC E2E: Stripe Secret Key in Vercel Production')
  console.log('  Task: fix-stripe-secret-key-not-set-in-vercel-production')
  console.log('  Target:', BASE_URL)
  console.log('═══════════════════════════════════════════════════\n')

  // ── AC1: Checkout endpoint must not return 503 "Stripe not configured" ──
  console.log('[AC1] POST /api/billing/create-checkout — must not return 503 "Stripe not configured"')

  await asyncTest('Checkout endpoint returns non-503 (STRIPE_SECRET_KEY is set)', async () => {
    const r = await postJSON(`${BASE_URL}/api/billing/create-checkout`, {
      priceId: 'price_test',
      agentId: 'test-agent-id',
      email: 'test@example.com',
    })
    assert.ok(
      r.status !== 503,
      `Got 503 — STRIPE_SECRET_KEY not set in Vercel production. Body: ${JSON.stringify(r.body)}`
    )
    if (r.status === 503 && typeof r.body === 'object') {
      assert.notStrictEqual(
        r.body.error,
        'Stripe not configured',
        `Stripe not configured error — env var missing from Vercel`
      )
    }
  })

  await asyncTest('Checkout endpoint body does not contain "Stripe not configured"', async () => {
    const r = await postJSON(`${BASE_URL}/api/billing/create-checkout`, {
      tier: 'starter_monthly',
      agentId: '00000000-0000-0000-0000-000000000001',
      email: 'qc@test.com',
    })
    const bodyStr = typeof r.body === 'string' ? r.body : JSON.stringify(r.body)
    assert.ok(
      !bodyStr.includes('Stripe not configured'),
      `Response contains "Stripe not configured" — STRIPE_SECRET_KEY missing. Status: ${r.status}`
    )
  })

  // ── AC2: Webhook endpoint must not return 503 "Stripe not configured" ──
  console.log('\n[AC2] POST /api/webhooks/stripe — must not return 503 "Stripe not configured"')

  await asyncTest('Webhook endpoint returns non-503 (STRIPE_WEBHOOK_SECRET is set)', async () => {
    const r = await postJSON(`${BASE_URL}/api/webhooks/stripe`, {})
    assert.ok(
      r.status !== 503,
      `Got 503 — STRIPE_WEBHOOK_SECRET not set in Vercel production. Body: ${JSON.stringify(r.body)}`
    )
    if (r.status === 503 && typeof r.body === 'object') {
      assert.notStrictEqual(
        r.body.error,
        'Stripe not configured',
        `Stripe not configured error — env var missing from Vercel`
      )
    }
  })

  await asyncTest('Webhook endpoint returns 400 (bad signature) or similar — not 503', async () => {
    const r = await postJSON(`${BASE_URL}/api/webhooks/stripe`, {})
    const bodyStr = typeof r.body === 'string' ? r.body : JSON.stringify(r.body)
    assert.ok(
      !bodyStr.includes('Stripe not configured'),
      `Response contains "Stripe not configured" — STRIPE_WEBHOOK_SECRET missing. Status: ${r.status}`
    )
    // When env vars are set, empty body → 400 (bad signature) is expected
    // 503 with "Stripe not configured" is a FAIL
    assert.ok(
      r.status !== 503 || !bodyStr.includes('Stripe not configured'),
      `Webhook returned 503 "Stripe not configured" — env var not set`
    )
  })

  // ── Summary ──────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(51)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    console.error('\n❌ QC E2E FAILED — Acceptance criteria not met')
    console.error('\nFailures:')
    failures.forEach(f => console.error(`  - ${f.label}: ${f.error}`))
    console.error('\nRequired action: Stojan must set STRIPE_SECRET_KEY and')
    console.error('STRIPE_WEBHOOK_SECRET in Vercel Dashboard → leadflow-ai → Settings → Environment Variables')
    process.exit(1)
  } else {
    console.log('\n✅ All QC E2E tests passed — Stripe env vars are configured in production')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
