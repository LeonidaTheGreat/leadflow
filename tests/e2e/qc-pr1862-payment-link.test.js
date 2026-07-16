'use strict'

/**
 * QC E2E test for PR #1862 — Direct Stripe Payment Link
 *
 * Validates correctness, security gates, and code quality by inspecting
 * the PR diff and running the backend server auth/validation checks.
 *
 * Verify: node tests/e2e/qc-pr1862-payment-link.test.js
 */

const assert = require('assert')
const { execSync } = require('child_process')
const http = require('http')
const path = require('path')
const fs = require('fs')

let passed = 0, failed = 0
const errors = []

function test(name, fn) {
  try {
    const result = fn()
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        console.log(`  ✅ ${name}`)
        passed++
      }).catch(e => {
        console.log(`  ❌ ${name}: ${e.message}`)
        errors.push({ name, error: e.message })
        failed++
      })
    }
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`)
    errors.push({ name, error: e.message })
    failed++
  }
}

// Load env for backend tests
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
  } catch { /* not present */ }
}

const diff = execSync('gh pr diff 1862 2>/dev/null || echo ""', { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 })
if (!diff.trim()) {
  console.error('Could not fetch PR #1862 diff')
  process.exit(1)
}

function extractFile(filePath) {
  const marker = `+++ b/${filePath}`
  const idx = diff.indexOf(marker)
  if (idx === -1) return null
  const nextFile = diff.indexOf('\ndiff --git', idx + 1)
  const section = nextFile === -1 ? diff.slice(idx) : diff.slice(idx, nextFile)
  return section
    .split('\n')
    .filter(l => l.startsWith('+') && !l.startsWith('+++'))
    .map(l => l.slice(1))
    .join('\n')
}

function request(method, port, reqPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const reqHeaders = { 'Content-Type': 'application/json', ...headers }
    if (payload) reqHeaders['Content-Length'] = Buffer.byteLength(payload)
    const req = http.request({ hostname: 'localhost', port, path: reqPath, method, headers: reqHeaders }, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

async function run() {
  console.log('\nQC E2E — PR #1862: Direct Stripe Payment Link\n')

  // === DIFF-BASED CORRECTNESS CHECKS ===

  console.log('-- Diff-based checks --')

  test('server.js registers payment-link router', () => {
    const src = extractFile('server.js')
    assert.ok(src, 'server.js not found in diff')
    assert.ok(
      src.includes("require('./routes/admin/payment-link')"),
      'payment-link router must be registered in server.js'
    )
  })

  test('Stripe webhook reads agent_id from metadata as fallback', () => {
    const src = extractFile('product/lead-response/dashboard/app/api/webhooks/stripe/route.ts')
    assert.ok(src, 'stripe webhook route.ts not found in diff')
    assert.ok(
      src.includes('metadata') && src.includes('agent_id'),
      'Webhook must read agent_id from session metadata for payment link flow'
    )
  })

  test('Stripe webhook validates metadata tier against known list', () => {
    const src = extractFile('product/lead-response/dashboard/app/api/webhooks/stripe/route.ts')
    assert.ok(src, 'stripe webhook route.ts not found in diff')
    assert.ok(
      src.includes('KNOWN_TIERS') && src.includes("includes(metadataTier)"),
      'Webhook must validate metadata tier against known tier list before using it'
    )
  })

  test('All new API routes have auth gates', () => {
    const routeFiles = [
      'routes/admin/payment-link.js',
      'product/lead-response/dashboard/app/api/admin/activation/route.ts',
      'product/lead-response/dashboard/app/api/admin/activation/completed/route.ts',
      'product/lead-response/dashboard/app/api/admin/sales-cockpit/send-payment-link-email/route.ts',
    ]
    for (const f of routeFiles) {
      const src = extractFile(f)
      if (!src) continue
      const hasAuth = src.includes('requireApiKey') || src.includes('requireAdmin')
      assert.ok(hasAuth, `${f} is missing auth gate (requireApiKey or requireAdmin)`)
    }
  })

  test('Backend payment-link.js uses parameterized SQL queries', () => {
    const src = extractFile('routes/admin/payment-link.js')
    assert.ok(src, 'routes/admin/payment-link.js not found in diff')
    assert.ok(src.includes('$1'), 'DB query must use parameterized placeholders ($1)')
    const hasStringConcat = /query\s*\(\s*['"`].*\+/.test(src)
    assert.ok(!hasStringConcat, 'SQL query must not use string concatenation')
  })

  test('Backend payment-link.js validates planTier input', () => {
    const src = extractFile('routes/admin/payment-link.js')
    assert.ok(src, 'routes/admin/payment-link.js not found in diff')
    assert.ok(src.includes('VALID_TIERS'), 'Must validate planTier against allowed tiers')
    assert.ok(src.includes("VALID_TIERS.includes(planTier)"), 'Must check planTier is in VALID_TIERS')
  })

  test('Backend payment-link.js validates agentId input', () => {
    const src = extractFile('routes/admin/payment-link.js')
    assert.ok(src, 'routes/admin/payment-link.js not found in diff')
    assert.ok(src.includes("!agentId") || src.includes("typeof agentId !== 'string'"),
      'Must validate agentId is a non-empty string')
  })

  test('Next.js payment-link route supports agentId lookup', () => {
    const src = extractFile('product/lead-response/dashboard/app/api/admin/sales-cockpit/payment-link/route.ts')
    assert.ok(src, 'payment-link/route.ts not found in diff')
    assert.ok(src.includes('agentId'), 'Must accept agentId parameter')
    assert.ok(src.includes("postgrestAdmin"), 'Must use postgrestAdmin for agent lookup')
  })

  test('Activation GET route supports stage parameter', () => {
    const src = extractFile('product/lead-response/dashboard/app/api/admin/activation/route.ts')
    assert.ok(src, 'activation/route.ts not found in diff')
    assert.ok(src.includes("stage") && src.includes("not_started") && src.includes("in_progress"),
      'Must support stage=not_started and stage=in_progress')
  })

  test('Activation POST route handles both single and bulk', () => {
    const src = extractFile('product/lead-response/dashboard/app/api/admin/activation/route.ts')
    assert.ok(src, 'activation/route.ts not found in diff')
    assert.ok(src.includes('agentId') && src.includes('bulkAll'),
      'POST must accept agentId (single) and bulkAll (bulk) modes')
  })

  test('Sales cockpit now includes onboarding_completed field', () => {
    const src = extractFile('product/lead-response/dashboard/app/api/admin/sales-cockpit/route.ts')
    assert.ok(src, 'sales-cockpit/route.ts not found in diff')
    assert.ok(src.includes('onboarding_completed'), 'Must include onboarding_completed in select and response')
  })

  test('Tier config amounts are consistent between backend and Next.js', () => {
    const backend = extractFile('routes/admin/payment-link.js')
    const nextjs = extractFile('product/lead-response/dashboard/app/api/admin/sales-cockpit/payment-link/route.ts')
    assert.ok(backend && nextjs, 'Both payment-link files must exist')
    for (const [tier, amount] of [['starter', '4900'], ['pro', '14900'], ['team', '39900']]) {
      assert.ok(backend.includes(amount), `Backend missing ${tier} amount ${amount}`)
      assert.ok(nextjs.includes(amount), `Next.js missing ${tier} amount ${amount}`)
    }
  })

  test('No hardcoded secrets or API keys in diff', () => {
    const secretPatterns = [/sk_live_[a-zA-Z0-9]+/, /sk_test_[a-zA-Z0-9]+/, /Bearer\s+[a-zA-Z0-9_-]{20,}/]
    for (const pattern of secretPatterns) {
      assert.ok(!pattern.test(diff), `Potential hardcoded secret found matching ${pattern}`)
    }
  })

  // === LIVE SERVER TESTS (backend on port 3888) ===

  console.log('\n-- Live server checks (port 3888) --')
  const API_KEY = process.env.LEADFLOW_API_KEY || ''

  let serverUp = false
  try {
    const res = await request('GET', 3888, '/api/health', null)
    serverUp = res.status === 200
  } catch { serverUp = false }

  if (!serverUp) {
    console.log('  ⚠️  Backend server not running on port 3888 — skipping live tests')
  } else {
    await test('POST /api/admin/create-payment-link returns 401 without auth', async () => {
      const res = await request('POST', 3888, '/api/admin/create-payment-link',
        { agentId: 'test', planTier: 'starter' })
      assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`)
    })

    await test('POST /api/admin/create-payment-link returns 401 with wrong key', async () => {
      const res = await request('POST', 3888, '/api/admin/create-payment-link',
        { agentId: 'test', planTier: 'starter' }, { 'x-api-key': 'wrong-key' })
      assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`)
    })

    if (API_KEY) {
      await test('Missing agentId returns 400', async () => {
        const res = await request('POST', 3888, '/api/admin/create-payment-link',
          { planTier: 'starter' }, { 'x-api-key': API_KEY })
        assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`)
      })

      await test('Invalid planTier returns 400', async () => {
        const res = await request('POST', 3888, '/api/admin/create-payment-link',
          { agentId: 'test-id', planTier: 'premium' }, { 'x-api-key': API_KEY })
        assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`)
      })

      await test('Unknown agentId returns 404', async () => {
        const res = await request('POST', 3888, '/api/admin/create-payment-link',
          { agentId: '00000000-0000-0000-0000-000000000000', planTier: 'starter' },
          { 'x-api-key': API_KEY })
        assert.ok([404, 503].includes(res.status),
          `Expected 404 or 503 (Stripe unconfigured), got ${res.status}`)
      })
    } else {
      console.log('  ⚠️  LEADFLOW_API_KEY not set — skipping authenticated tests')
    }
  }

  // === REPORT ===

  console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    console.log('\nFailing checks:')
    for (const { name, error } of errors) {
      console.log(`  • ${name}`)
      console.log(`    ${error}\n`)
    }
    process.exit(1)
  }
}

run().catch(e => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
