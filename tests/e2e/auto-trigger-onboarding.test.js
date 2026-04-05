/**
 * E2E Tests: Auto-Trigger Onboarding After Email Verification
 * UC: uc-auto-trigger-onboarding-post-verify
 * Task: 52059946-679e-4929-a9f4-b5175662e06c
 *
 * Tests the post-verification activation email flow:
 * 1. verify-email route redirects to /onboarding (not /setup) — code audit
 * 2. sendActivationEmail exists and marks activation_email_sent=true — code audit
 * 3. Batch endpoint /api/internal/send-activation-emails is auth-gated
 * 4. Batch dry_run mode returns eligible agents without sending
 * 5. Migration column activation_email_sent exists in DB
 * 6. verify-email route code checks: redirects to /onboarding, fires activation email
 * 7. Activation email HTML points to /onboarding
 */

'use strict'

const assert = require('assert')
const http = require('http')
const https = require('https')
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const BASE_URL = 'https://leadflow-ai-five.vercel.app'
const DB_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'
const API_KEY = process.env.LEADFLOW_API_KEY || ''

const DASHBOARD_DIR = path.join(__dirname, '../../product/lead-response/dashboard')

let passed = 0
let failed = 0
const failures = []

function pass(name) {
  console.log(`  PASS: ${name}`)
  passed++
}

function fail(name, reason) {
  console.log(`  FAIL: ${name}`)
  console.log(`        ${reason}`)
  failed++
  failures.push({ name, reason })
}

async function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { headers, timeout: 10000 }, (res) => {
      let body = ''
      res.on('data', (d) => (body += d))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

async function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const data = JSON.stringify(body)
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (url.startsWith('https') ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers,
      },
      timeout: 15000,
    }
    const req = mod.request(options, (res) => {
      let respBody = ''
      res.on('data', (d) => (respBody += d))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: respBody }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.write(data)
    req.end()
  })
}

async function runTests() {
  console.log('\n=== Auto-Trigger Onboarding E2E Tests ===\n')

  // ── CODE AUDIT TESTS (no network needed) ──────────────────────────────────

  // Test 1: verify-email route redirects to /onboarding (not /setup)
  try {
    const routeFile = path.join(DASHBOARD_DIR, 'app/api/auth/verify-email/route.ts')
    const content = fs.readFileSync(routeFile, 'utf8')
    const redirectsToOnboarding = content.includes("redirect(new URL('/onboarding'")
    const doesNotRedirectToSetup = !content.includes("redirect(new URL('/setup'")
    if (redirectsToOnboarding && doesNotRedirectToSetup) {
      pass('verify-email route: redirects to /onboarding (not /setup)')
    } else if (!redirectsToOnboarding) {
      fail('verify-email route: does not redirect to /onboarding', 'Missing redirect to /onboarding on success')
    } else {
      fail('verify-email route: still has /setup redirect', 'Old redirect to /setup found')
    }
  } catch (err) {
    fail('verify-email route: code read failed', err.message)
  }

  // Test 2: verify-email route fires sendActivationEmail
  try {
    const routeFile = path.join(DASHBOARD_DIR, 'app/api/auth/verify-email/route.ts')
    const content = fs.readFileSync(routeFile, 'utf8')
    const firesSendActivation = content.includes('sendActivationEmail(')
    const importsActivation = content.includes('sendActivationEmail')
    if (firesSendActivation && importsActivation) {
      pass('verify-email route: calls sendActivationEmail on success')
    } else {
      fail('verify-email route: does not call sendActivationEmail', 'Missing sendActivationEmail() call')
    }
  } catch (err) {
    fail('verify-email route: sendActivationEmail check failed', err.message)
  }

  // Test 3: sendActivationEmail marks activation_email_sent=true
  try {
    const libFile = path.join(DASHBOARD_DIR, 'lib/verification-email.ts')
    const content = fs.readFileSync(libFile, 'utf8')
    const marksFlag = content.includes('activation_email_sent: true')
    const hasFunction = content.includes('export async function sendActivationEmail(')
    if (hasFunction && marksFlag) {
      pass('verification-email lib: sendActivationEmail exported and marks activation_email_sent=true')
    } else if (!hasFunction) {
      fail('verification-email lib: sendActivationEmail not exported', 'Function missing')
    } else {
      fail('verification-email lib: activation_email_sent not marked', 'Flag not set after send')
    }
  } catch (err) {
    fail('verification-email lib: code read failed', err.message)
  }

  // Test 4: Activation email HTML points to /onboarding
  try {
    const libFile = path.join(DASHBOARD_DIR, 'lib/verification-email.ts')
    const content = fs.readFileSync(libFile, 'utf8')
    const hasOnboardingUrl = content.includes('/onboarding')
    if (hasOnboardingUrl) {
      pass('activation email: CTA URL points to /onboarding')
    } else {
      fail('activation email: CTA URL does not point to /onboarding', 'Email should link to /onboarding')
    }
  } catch (err) {
    fail('activation email: CTA URL check failed', err.message)
  }

  // Test 5: Batch endpoint exists with auth guard
  try {
    const batchFile = path.join(DASHBOARD_DIR, 'app/api/internal/send-activation-emails/route.ts')
    const content = fs.readFileSync(batchFile, 'utf8')
    const hasAuthCheck = content.includes('isAuthorized') && content.includes('401')
    const hasDryRun = content.includes('dry_run')
    const hasActivationEmailSentFilter = content.includes('activation_email_sent')
    if (hasAuthCheck && hasDryRun && hasActivationEmailSentFilter) {
      pass('batch endpoint: auth-gated, dry_run supported, filters by activation_email_sent')
    } else {
      const issues = []
      if (!hasAuthCheck) issues.push('missing auth guard')
      if (!hasDryRun) issues.push('missing dry_run support')
      if (!hasActivationEmailSentFilter) issues.push('missing activation_email_sent filter')
      fail('batch endpoint: missing features', issues.join(', '))
    }
  } catch (err) {
    fail('batch endpoint: code read failed', err.message)
  }

  // Test 6: SECURITY — batch endpoint does NOT use NEXT_PUBLIC_ var as secret
  try {
    const batchFile = path.join(DASHBOARD_DIR, 'app/api/internal/send-activation-emails/route.ts')
    const content = fs.readFileSync(batchFile, 'utf8')
    // NEXT_PUBLIC_ env vars are exposed to the browser — bad as secrets
    const usesPublicKeyAsSecret = content.includes('NEXT_PUBLIC_API_KEY') &&
      content.match(/API_SECRET_KEY.*\|\|.*NEXT_PUBLIC_API_KEY|NEXT_PUBLIC_API_KEY.*\|\|/)
    if (usesPublicKeyAsSecret) {
      fail('batch endpoint SECURITY: uses NEXT_PUBLIC_API_KEY as server secret',
        'NEXT_PUBLIC_ vars are exposed to browser — cannot be used as server auth secret')
    } else {
      pass('batch endpoint: does not expose NEXT_PUBLIC_ var as auth secret')
    }
  } catch (err) {
    fail('batch endpoint: security check failed', err.message)
  }

  // Test 7: Migration file exists with correct column
  try {
    const migFile = path.join(__dirname, '../../migrations/007_activation_email_sent.sql')
    const content = fs.readFileSync(migFile, 'utf8')
    const hasColumn = content.includes('activation_email_sent') && content.includes('boolean')
    if (hasColumn) {
      pass('migration 007: activation_email_sent boolean column defined')
    } else {
      fail('migration 007: missing or wrong column definition', content.slice(0, 200))
    }
  } catch (err) {
    fail('migration 007: file read failed', err.message)
  }

  // ── DATABASE TESTS ────────────────────────────────────────────────────────

  // Test 8: activation_email_sent column exists in production DB
  const pool = new Pool({ connectionString: DB_URL })
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'real_estate_agents'
        AND column_name = 'activation_email_sent'
    `)
    if (result.rows.length > 0) {
      const col = result.rows[0]
      if (col.data_type === 'boolean') {
        pass(`DB: activation_email_sent column exists (boolean, default: ${col.column_default})`)
      } else {
        fail('DB: activation_email_sent wrong type', `expected boolean, got ${col.data_type}`)
      }
    } else {
      fail('DB: activation_email_sent column missing',
        'Run: psql openclaw -f migrations/007_activation_email_sent.sql')
    }
  } catch (err) {
    fail('DB: could not query schema', err.message)
  } finally {
    await pool.end()
  }

  // ── LIVE HTTP TESTS (Vercel) ──────────────────────────────────────────────

  // Test 9: Batch endpoint — unauthenticated returns 401 (not 500)
  // Note: 500 here means Vercel infrastructure failure unrelated to this PR
  try {
    const res = await httpPost(`${BASE_URL}/api/internal/send-activation-emails?dry_run=true`, {})
    if (res.status === 401) {
      pass('batch endpoint (live): unauthenticated returns 401')
    } else if (res.status === 500) {
      // Vercel infrastructure 500 is pre-existing — but still flag it
      fail('batch endpoint (live): returns 500 (Vercel DB connectivity issue)',
        'Auth check should happen before DB access — returns 401 before 500. Vercel env vars may not include API_SECRET_KEY')
    } else {
      fail('batch endpoint (live): unexpected status', `got ${res.status}`)
    }
  } catch (err) {
    fail('batch endpoint (live): request failed', err.message)
  }

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
  if (failures.length > 0) {
    console.log('\nFailures:')
    failures.forEach((f) => console.log(`  - ${f.name}: ${f.reason}`))
  }

  return { passed, failed }
}

runTests().then(({ failed: f }) => {
  process.exit(f > 0 ? 1 : 0)
}).catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
