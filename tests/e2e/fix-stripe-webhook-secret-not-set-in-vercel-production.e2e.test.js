/**
 * E2E Test: fix-stripe-webhook-secret-not-set-in-vercel-production
 * ================================================================
 * Task ID: 89ebe48a-6919-4ddc-9786-5c4b126279fc
 *
 * Verifies acceptance criteria from PRD-FIX-STRIPE-ENV-VARS-VERCEL.md:
 *
 * AC1: POST /api/billing/create-checkout → NOT 503 "Stripe not configured"
 * AC2: POST /api/webhooks/stripe → NOT 503 "Stripe not configured"
 *
 * These tests hit production. Failure = STRIPE_WEBHOOK_SECRET still missing.
 * Required action: Stojan must add STRIPE_WEBHOOK_SECRET in Vercel Dashboard.
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
  console.log('  QC E2E: STRIPE_WEBHOOK_SECRET in Vercel Production')
  console.log('  Task: fix-stripe-webhook-secret-not-set-in-vercel-production')
  console.log('  Target:', BASE_URL)
  console.log('═══════════════════════════════════════════════════\n')

  // ── AC2: Webhook endpoint must NOT return 503 "Stripe not configured" ──
  console.log('[AC2] POST /api/webhooks/stripe — must not return 503 "Stripe not configured"')

  await asyncTest('Webhook endpoint returns non-503 (STRIPE_WEBHOOK_SECRET is set)', async () => {
    const r = await postJSON(`${BASE_URL}/api/webhooks/stripe`, {})
    assert.ok(
      r.status !== 503,
      `Got HTTP 503 — STRIPE_WEBHOOK_SECRET not set in Vercel production. Body: ${JSON.stringify(r.body)}`
    )
  })

  await asyncTest('Webhook response body does not contain "Stripe not configured"', async () => {
    const r = await postJSON(`${BASE_URL}/api/webhooks/stripe`, {})
    const bodyStr = typeof r.body === 'string' ? r.body : JSON.stringify(r.body)
    assert.ok(
      !bodyStr.includes('Stripe not configured'),
      `Response contains "Stripe not configured" — STRIPE_WEBHOOK_SECRET missing from Vercel. Status: ${r.status}`
    )
  })

  await asyncTest('Webhook endpoint returns 400 (bad signature) — not 503', async () => {
    const r = await postJSON(`${BASE_URL}/api/webhooks/stripe`, {})
    assert.ok(
      r.status === 400,
      `Expected 400 (bad signature after env var is set), got ${r.status}. If 503: env var still missing.`
    )
  })

  // ── AC1: Checkout endpoint must NOT return 503 "Stripe not configured" ──
  console.log('\n[AC1] POST /api/billing/create-checkout — must not return 503 "Stripe not configured"')

  await asyncTest('Checkout endpoint returns non-503 (STRIPE_SECRET_KEY is set)', async () => {
    const r = await postJSON(`${BASE_URL}/api/billing/create-checkout`, {
      tier: 'starter_monthly',
      agentId: '00000000-0000-0000-0000-000000000001',
      email: 'qc@test.com',
    })
    assert.ok(
      r.status !== 503,
      `Got HTTP 503 — STRIPE_SECRET_KEY not set in Vercel production. Body: ${JSON.stringify(r.body)}`
    )
  })

  await asyncTest('Checkout response body does not contain "Stripe not configured"', async () => {
    const r = await postJSON(`${BASE_URL}/api/billing/create-checkout`, {
      tier: 'starter_monthly',
      agentId: '00000000-0000-0000-0000-000000000001',
      email: 'qc@test.com',
    })
    const bodyStr = typeof r.body === 'string' ? r.body : JSON.stringify(r.body)
    assert.ok(
      !bodyStr.includes('Stripe not configured'),
      `Response contains "Stripe not configured" — STRIPE_SECRET_KEY missing from Vercel. Status: ${r.status}`
    )
  })

  // ── Summary ──────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(51)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    console.error('\n❌ QC E2E FAILED — Acceptance criteria not met')
    console.error('\nRequired human action:')
    console.error('  1. Go to https://vercel.com/dashboard → leadflow-ai → Settings → Environment Variables')
    console.error('  2. Add STRIPE_SECRET_KEY = sk_live_... (from Stripe Dashboard → Developers → API Keys)')
    console.error('  3. Add STRIPE_WEBHOOK_SECRET = whsec_... (from Stripe Dashboard → Webhooks → Signing secret)')
    console.error('  4. Redeploy the latest Vercel deployment')
    console.error('\nSee STRIPE-ENV-VARS-FIX-STATUS.md for full instructions.')
    failures.forEach(f => console.error(`  ❌ ${f.label}: ${f.error}`))
    process.exit(1)
  } else {
    console.log('\n✅ All QC E2E tests passed — Stripe env vars configured correctly')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
