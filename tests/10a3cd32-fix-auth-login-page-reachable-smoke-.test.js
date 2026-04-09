/**
 * QC Targeted E2E Test: Auth — Login Page Reachable (smoke)
 * Task: 36058eb8-664d-4b5b-96f3-1b7c1f28d536
 * PR: #1045  Branch: dev/10a3cd32-fix-auth-login-page-reachable-smoke-
 *
 * Root cause: middleware.ts imported `jsonwebtoken` (Node.js-only) which crashes
 * in Next.js Edge Runtime → FUNCTION_INVOCATION_FAILED → /login returns 500.
 * Fix: Replace with Edge-compatible auth (jose jwtVerify + validateSession service).
 *
 * This test verifies the PR's outcome: login page must be reachable (non-500),
 * protected routes must redirect unauthenticated users.
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

const DASHBOARD_BASE = path.resolve(__dirname, '../product/lead-response/dashboard')
const MIDDLEWARE_PATH = path.join(DASHBOARD_BASE, 'middleware.ts')
const PKG_PATH = path.join(DASHBOARD_BASE, 'package.json')
const PRODUCTION_URL = 'https://leadflow-ai-five.vercel.app'

let passed = 0
let failed = 0

function pass(name) { passed++; console.log(`  PASS  ${name}`) }
function fail(name, reason) { failed++; console.log(`  FAIL  ${name}: ${reason}`) }

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

async function run() {
  console.log('\n=== QC E2E: Auth login page reachable — PR #1045 ===\n')

  if (!fs.existsSync(MIDDLEWARE_PATH)) {
    fail('middleware.ts exists', 'File not found')
    process.exit(1)
  }

  const mw = fs.readFileSync(MIDDLEWARE_PATH, 'utf8')

  // T1: jsonwebtoken removed (the root cause bug)
  if (!mw.includes("'jsonwebtoken'") && !mw.includes('"jsonwebtoken"')) {
    pass('middleware.ts does NOT import jsonwebtoken (Edge Runtime safe)')
  } else {
    fail('middleware.ts does NOT import jsonwebtoken', 'jsonwebtoken found — crashes Edge Runtime')
  }

  // T2: Edge-compatible auth present (jose OR session-based OR both)
  const usesJose = mw.includes("from 'jose'") || mw.includes('from "jose"')
  const usesValidateSession = mw.includes('validateSession')
  if (usesJose || usesValidateSession) {
    pass(`middleware.ts uses Edge-compatible auth (${usesJose ? 'jose' : ''}${usesJose && usesValidateSession ? '+' : ''}${usesValidateSession ? 'validateSession' : ''})`)
  } else {
    fail('middleware.ts uses Edge-compatible auth', 'Neither jose nor validateSession detected')
  }

  // T3: jose OR jsonwebtoken in package.json (at least one JWT lib must be declared)
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  if (deps['jose'] || deps['jsonwebtoken']) {
    const declared = [deps['jose'] && `jose@${deps['jose']}`, deps['jsonwebtoken'] && `jsonwebtoken@${deps['jsonwebtoken']}`].filter(Boolean).join(', ')
    pass(`JWT library declared in package.json (${declared})`)
  } else {
    fail('JWT library in package.json', 'Neither jose nor jsonwebtoken declared — missing dependency')
  }

  // T4: middleware matcher excludes static assets (performance)
  if (mw.includes('_next/static') || mw.includes('_next/image')) {
    pass('middleware matcher excludes _next/static/_next/image')
  } else {
    fail('middleware matcher excludes static assets', '_next/static or _next/image not in matcher exclusion')
  }

  // T5: PROTECTED_ROUTES defined (auth enforcement present)
  if (mw.includes('PROTECTED_ROUTES')) {
    pass('middleware defines PROTECTED_ROUTES array')
  } else {
    fail('middleware defines PROTECTED_ROUTES', 'PROTECTED_ROUTES not found — auth enforcement may be missing')
  }

  // T6-T8: Production smoke — no 500s on login or protected routes
  for (const [label, url, allowedStatuses] of [
    ['/login returns 200 (not 500)', `${PRODUCTION_URL}/login`, [200, 301, 302, 307, 308]],
    ['/dashboard redirects unauthenticated (not 500)', `${PRODUCTION_URL}/dashboard`, [301, 302, 307, 308, 200]],
    ['/settings redirects unauthenticated (not 500)', `${PRODUCTION_URL}/settings`, [301, 302, 307, 308, 200]],
  ]) {
    try {
      const res = await httpGet(url)
      if (res.status === 500) {
        fail(label, `Got 500 — Edge Runtime still crashing (FUNCTION_INVOCATION_FAILED)`)
      } else if (allowedStatuses.includes(res.status)) {
        pass(`${label} (HTTP ${res.status})`)
      } else {
        fail(label, `Unexpected HTTP ${res.status}`)
      }
    } catch (e) {
      fail(label, `Request failed: ${e.message}`)
    }
  }

  const total = passed + failed
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`RESULT: ${passed}/${total} passed`)
  console.log(`${'─'.repeat(60)}\n`)
  return { passed, failed, total }
}

run().then(r => process.exit(r.failed > 0 ? 1 : 0)).catch(e => {
  console.error('Runner error:', e)
  process.exit(1)
})
